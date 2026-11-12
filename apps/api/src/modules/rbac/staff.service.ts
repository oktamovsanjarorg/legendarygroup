import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CreateStaffResult, StaffInvite, StaffRole } from '@lg/contracts';
import {
  type Database,
  type InviteChannel,
  roles,
  type Transaction,
  userRoles,
  users,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { EnvService } from '../../config/env.service.js';
import { type InviteLinks, issueInvite } from './staff-invites.js';
import { bumpPermissionsVersion } from './user-version.js';

type UserRow = Pick<typeof users.$inferSelect, 'id' | 'status' | 'passwordHash' | 'telegramId'>;

const WEB_STAFF: readonly string[] = ['director', 'admin'];

/**
 * Qaysi kanal orqali taklif kerak (T-101): web roli bor va paroli yo'q — `web`;
 * ustoz va Telegram bog'lanmagan — `bot`; aks holda — kerak emas.
 */
export function neededChannel(u: UserRow, roleCodes: readonly string[]): InviteChannel | null {
  if (roleCodes.some((r) => WEB_STAFF.includes(r)) && !u.passwordHash) return 'web';
  if (roleCodes.includes('teacher') && u.telegramId === null) return 'bot';
  return null;
}

/** Xodimlarni boshqarish (T-101, FR-AUTH-5): yaratish, taklif, blokdan chiqarish, rol qo'shish. */
@Injectable()
export class StaffService {
  private readonly links: InviteLinks;

  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(EnvService) env: EnvService,
  ) {
    this.links = {
      appUrl: env.get('PUBLIC_APP_URL'),
      botUsername: env.get('TELEGRAM_BOT_USERNAME'),
    };
  }

  /**
   * Yangi xodim yoki mavjud foydalanuvchiga (masalan, ota-ona ham ustoz) rol qo'shish.
   * Telefon — yagona kalit; rol allaqachon bo'lsa — `ALREADY_STAFF`.
   */
  async create(
    ctx: AuditContext,
    input: { phone: string; fullName: string; role: StaffRole },
  ): Promise<CreateStaffResult> {
    return this.db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(users)
        .where(eq(users.phone, input.phone))
        .for('update');
      if (existing?.status === 'blocked')
        throw new AppException(HttpStatus.CONFLICT, 'USER_BLOCKED');
      const user =
        existing ??
        (
          await tx
            .insert(users)
            .values({ fullName: input.fullName, phone: input.phone })
            .returning()
        )[0];
      if (!user) throw new Error('foydalanuvchi yaratilmadi');
      await this.grantRole(tx, user.id, input.role);
      const invite = await this.inviteIfNeeded(tx, user);
      await this.audit.record(
        ctx,
        {
          action: 'staff.create',
          entity: 'user',
          entityId: user.id,
          after: { role: input.role, existed: Boolean(existing) },
        },
        tx,
      );
      return { id: user.id, invite };
    });
  }

  /** Taklifni qayta yuborish: eski havola darhol yaroqsiz (`issueInvite`). */
  async reissueInvite(ctx: AuditContext, userId: string): Promise<StaffInvite> {
    return this.db.transaction(async (tx) => {
      const user = await this.lockUser(tx, userId);
      if (user.status === 'blocked') throw new AppException(HttpStatus.CONFLICT, 'USER_BLOCKED');
      const invite = await this.inviteIfNeeded(tx, user);
      if (!invite) throw new AppException(HttpStatus.CONFLICT, 'INVITE_NOT_NEEDED');
      await this.audit.record(
        ctx,
        {
          action: 'staff.invite',
          entity: 'user',
          entityId: userId,
          after: { channel: invite.channel },
        },
        tx,
      );
      return invite;
    });
  }

  /** Blokdan chiqarish (blokdagi sessiyalar qaytmaydi — qayta kiradi). */
  async unblock(ctx: AuditContext, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [u] = await tx
        .update(users)
        .set({ status: 'active' })
        .where(and(eq(users.id, userId), eq(users.status, 'blocked')))
        .returning({ id: users.id });
      if (!u) {
        await this.lockUser(tx, userId); // yo'q bo'lsa — NOT_FOUND
        throw new AppException(HttpStatus.CONFLICT, 'NOT_BLOCKED');
      }
      await bumpPermissionsVersion(tx, userId);
      await this.audit.record(
        ctx,
        { action: 'user.unblock', entity: 'user', entityId: userId, after: { status: 'active' } },
        tx,
      );
    });
  }

  /** Rol qo'shish (FR-AUTH-5): kerak bo'lsa — yangi kanal uchun taklif. */
  async addRole(ctx: AuditContext, userId: string, role: StaffRole): Promise<CreateStaffResult> {
    return this.db.transaction(async (tx) => {
      const user = await this.lockUser(tx, userId);
      if (user.status === 'blocked') throw new AppException(HttpStatus.CONFLICT, 'USER_BLOCKED');
      await this.grantRole(tx, userId, role);
      const invite = await this.inviteIfNeeded(tx, user);
      await this.audit.record(
        ctx,
        { action: 'user.role_add', entity: 'user', entityId: userId, after: { role } },
        tx,
      );
      return { id: userId, invite };
    });
  }

  private async lockUser(tx: Transaction, userId: string): Promise<UserRow> {
    const [u] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!u) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    return u;
  }

  private async grantRole(tx: Transaction, userId: string, role: StaffRole): Promise<void> {
    const [r] = await tx.select({ id: roles.id }).from(roles).where(eq(roles.code, role));
    if (!r) throw new Error(`rol seed qilinmagan: ${role}`);
    const added = await tx
      .insert(userRoles)
      .values({ userId, roleId: r.id })
      .onConflictDoNothing()
      .returning();
    if (added.length === 0) throw new AppException(HttpStatus.CONFLICT, 'ALREADY_STAFF');
    await bumpPermissionsVersion(tx, userId);
  }

  private async inviteIfNeeded(tx: Transaction, user: UserRow): Promise<StaffInvite | null> {
    const codes = await tx
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(eq(userRoles.userId, user.id));
    const channel = neededChannel(
      user,
      codes.map((c) => c.code),
    );
    return channel
      ? issueInvite(tx, this.links, { userId: user.id, channel, now: this.clock.now() })
      : null;
  }
}
