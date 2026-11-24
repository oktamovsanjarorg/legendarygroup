import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { CreateStaffResult, StaffRole } from '@lg/contracts';
import { type Database, roles, type Transaction, userRoles, users } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, eq, inArray } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { EnvService } from '../../config/env.service.js';
import { STAFF_CODES } from './staff-link.service.js';
import { unlinkTelegram } from './telegram-unlink.js';
import { bumpPermissionsVersion } from './user-version.js';

type UserRow = Pick<typeof users.$inferSelect, 'id' | 'status' | 'telegramId'>;

/** Bot havolasi (Q-98): xodim «Start» bosib, o'z raqamini ulashadi. */
export const botLink = (username: string): string => `https://t.me/${username}`;

/** Xodimlarni boshqarish (T-101, FR-AUTH-5): yaratish, blokdan chiqarish, rol, Telegram'ni uzish. */
@Injectable()
export class StaffService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(EnvService) private readonly env: EnvService,
  ) {}

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
      return { id: user.id, botUrl: this.botUrlFor(user) };
    });
  }

  /** Telegram'ni uzish (Q-98): xodim yangi Telegram'dan raqamini qayta ulashadi. */
  async unlinkTelegram(ctx: AuditContext, userId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const user = await this.lockUser(tx, userId);
      await this.assertStaff(tx, userId);
      if (user.telegramId === null)
        throw new AppException(HttpStatus.CONFLICT, 'STAFF_TELEGRAM_NOT_LINKED');
      await unlinkTelegram(tx, userId, this.clock.now());
      await this.audit.record(
        ctx,
        { action: 'staff.telegram_unlinked', entity: 'user', entityId: userId },
        tx,
      );
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

  /** Rol qo'shish (FR-AUTH-5). */
  async addRole(ctx: AuditContext, userId: string, role: StaffRole): Promise<CreateStaffResult> {
    return this.db.transaction(async (tx) => {
      const user = await this.lockUser(tx, userId);
      if (user.status === 'blocked') throw new AppException(HttpStatus.CONFLICT, 'USER_BLOCKED');
      await this.grantRole(tx, userId, role);
      await this.audit.record(
        ctx,
        { action: 'user.role_add', entity: 'user', entityId: userId, after: { role } },
        tx,
      );
      return { id: userId, botUrl: this.botUrlFor(user) };
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

  private async assertStaff(tx: Transaction, userId: string): Promise<void> {
    const rows = await tx
      .select({ code: roles.code })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.userId, userId), inArray(roles.code, STAFF_CODES)))
      .limit(1);
    if (rows.length === 0) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  private botUrlFor(user: UserRow): string | null {
    return user.telegramId === null ? botLink(this.env.get('TELEGRAM_BOT_USERNAME')) : null;
  }
}
