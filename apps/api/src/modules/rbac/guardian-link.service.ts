import { Inject, Injectable } from '@nestjs/common';
import type {
  BotGuardianContactRequest,
  BotGuardianContactResult,
  BotTelegramStatusResult,
} from '@lg/contracts';
import {
  type Database,
  guardianLinkRequests,
  guardians,
  roles,
  studentGuardians,
  students,
  userRoles,
  users,
} from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, desc, eq } from 'drizzle-orm';
import { AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { normalizePhone } from './staff-link.service.js';

/**
 * Ota-onalarni bot orqali bog'lash servisi (T-110, FR-AUTH-1).
 */
@Injectable()
export class GuardianLinkService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async checkTelegramStatus(telegramId: bigint): Promise<BotTelegramStatusResult> {
    const [user] = await this.db.select().from(users).where(eq(users.telegramId, telegramId));

    if (user) {
      const userRoleRows = await this.db
        .select({ code: roles.code })
        .from(userRoles)
        .innerJoin(roles, eq(roles.id, userRoles.roleId))
        .where(eq(userRoles.userId, user.id));
      const roleCodes = userRoleRows.map((r) => r.code);

      if (roleCodes.includes('guardian')) {
        const [guardian] = await this.db
          .select()
          .from(guardians)
          .where(eq(guardians.userId, user.id));

        let studentList: { id: string; fullName: string }[] = [];
        if (guardian) {
          studentList = await this.db
            .select({ id: students.id, fullName: students.fullName })
            .from(studentGuardians)
            .innerJoin(students, eq(students.id, studentGuardians.studentId))
            .where(eq(studentGuardians.guardianId, guardian.id));
        }

        return {
          status: 'linked',
          role: 'guardian',
          fullName: user.fullName,
          students: studentList,
        };
      }

      return {
        status: 'linked',
        role: roleCodes[0] ?? 'staff',
        fullName: user.fullName,
      };
    }

    const [req] = await this.db
      .select()
      .from(guardianLinkRequests)
      .where(eq(guardianLinkRequests.telegramId, telegramId))
      .orderBy(desc(guardianLinkRequests.createdAt))
      .limit(1);

    if (req) {
      if (req.status === 'pending') {
        return { status: 'pending_approval' };
      }
      if (req.status === 'rejected') {
        return { status: 'rejected', rejectReason: req.rejectReason ?? undefined };
      }
    }

    return { status: 'not_registered' };
  }

  async linkGuardianByContact(input: BotGuardianContactRequest): Promise<BotGuardianContactResult> {
    const phone = normalizePhone(input.phone);
    return this.db.transaction(async (tx) => {
      const [existingGuardian] = await tx
        .select()
        .from(guardians)
        .where(eq(guardians.phone, phone))
        .for('update');

      if (!existingGuardian) {
        const [pendingReq] = await tx
          .select()
          .from(guardianLinkRequests)
          .where(
            and(
              eq(guardianLinkRequests.telegramId, input.telegramId),
              eq(guardianLinkRequests.status, 'pending'),
            ),
          );
        if (pendingReq) return { result: 'pending_approval' };

        await tx.insert(guardianLinkRequests).values({
          telegramId: input.telegramId,
          phone,
          fullName: input.fullName,
          telegramUsername: input.username ?? null,
          status: 'pending',
        });
        return { result: 'request_created' };
      }

      const userId = await this.resolveGuardianUserId(tx, existingGuardian, input, phone);

      await tx
        .update(guardianLinkRequests)
        .set({
          status: 'approved',
          resolvedGuardianId: existingGuardian.id,
          resolvedAt: this.clock.now(),
        })
        .where(
          and(
            eq(guardianLinkRequests.telegramId, input.telegramId),
            eq(guardianLinkRequests.status, 'pending'),
          ),
        );

      const studentList = await tx
        .select({ id: students.id, fullName: students.fullName })
        .from(studentGuardians)
        .innerJoin(students, eq(students.id, studentGuardians.studentId))
        .where(eq(studentGuardians.guardianId, existingGuardian.id));

      await this.audit.record(
        { actorId: userId, actorRole: 'guardian', ip: null, userAgent: null, requestId: null },
        { action: 'guardian.telegram_linked', entity: 'guardian', entityId: existingGuardian.id },
        tx,
      );

      return {
        result: 'guardian_linked',
        fullName: existingGuardian.fullName,
        students: studentList,
      };
    });
  }

  private async resolveGuardianUserId(
    tx: Parameters<Parameters<Database['transaction']>[0]>[0],
    existingGuardian: typeof guardians.$inferSelect,
    input: BotGuardianContactRequest,
    phone: string,
  ): Promise<string> {
    if (existingGuardian.userId) {
      await tx
        .update(users)
        .set({
          telegramId: input.telegramId,
          telegramUsername: input.username ?? null,
        })
        .where(eq(users.id, existingGuardian.userId));
      return existingGuardian.userId;
    }

    let [existingUser] = await tx.select().from(users).where(eq(users.phone, phone)).for('update');
    if (!existingUser) {
      const [newUser] = await tx
        .insert(users)
        .values({
          fullName: existingGuardian.fullName,
          phone,
          telegramId: input.telegramId,
          telegramUsername: input.username ?? null,
          status: 'active',
        })
        .returning();
      if (!newUser) throw new Error('Foydalanuvchi yaratilmadi');
      existingUser = newUser;
    } else {
      await tx
        .update(users)
        .set({
          telegramId: input.telegramId,
          telegramUsername: input.username ?? null,
        })
        .where(eq(users.id, existingUser.id));
    }

    const [guardianRole] = await tx.select().from(roles).where(eq(roles.code, 'guardian'));
    if (guardianRole) {
      await tx
        .insert(userRoles)
        .values({ userId: existingUser.id, roleId: guardianRole.id })
        .onConflictDoNothing();
    }

    await tx
      .update(guardians)
      .set({ userId: existingUser.id })
      .where(eq(guardians.id, existingGuardian.id));

    return existingUser.id;
  }
}
