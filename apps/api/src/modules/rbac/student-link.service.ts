import { createHash } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type BotStudentLinkRequest,
  type BotStudentLinkResult,
  normalizePhone,
} from '@lg/contracts';
import {
  type Database,
  guardians,
  roles,
  studentGuardians,
  students,
  userRoles,
  users,
} from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { AuditService } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { RateLimiter, type RateLimit } from '../../common/rate-limit/rate-limiter.js';

/** Oʻquvchi kirish kodi xeshi (D2) — yaratishda va bogʻlashda bitta funksiya. */
export const hashAccessCode = (code: string): string =>
  createHash('sha256').update(code).digest('hex');

const STUDENT_LINK_LIMIT: RateLimit = {
  scope: 'student:link',
  limit: 5,
  windowS: 15 * 60,
};

type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

/**
 * Oʻquvchini bot orqali bogʻlash servisi (T-126, D1–D5).
 */
@Injectable()
export class StudentLinkService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  async linkStudent(input: BotStudentLinkRequest): Promise<BotStudentLinkResult> {
    const tgStr = String(input.telegramId);
    try {
      await this.limiter.hit(STUDENT_LINK_LIMIT, tgStr);
    } catch (err) {
      if (err instanceof AppException && err.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        return { result: 'rate_limited' };
      }
      throw err;
    }

    const phone = normalizePhone(input.phone);
    if (!phone) return { result: 'invalid' };

    const hash = hashAccessCode(input.code);

    return await this.db.transaction(async (tx) => {
      const [student] = await tx
        .select()
        .from(students)
        .where(eq(students.accessCodeHash, hash))
        .for('update');

      if (!student || student.archivedAt !== null) {
        return { result: 'invalid' };
      }

      const phoneMatches = await this.checkPhoneMatch(tx, student.id, student.phone, phone);
      if (!phoneMatches) {
        return { result: 'invalid' };
      }

      if (student.userId !== null) {
        const own = await this.isOwnTelegram(tx, student.userId, input.telegramId);
        return { result: own ? 'already_linked' : 'in_use' };
      }

      const user = await this.resolveStudentUser(tx, input.telegramId, phone, student.fullName);
      if (user === 'already_linked' || user === 'in_use') return { result: user };

      await this.attachStudentRole(tx, user.id);
      await tx.update(students).set({ userId: user.id }).where(eq(students.id, student.id));

      await this.audit.record(
        { actorId: user.id, actorRole: 'student', ip: null, userAgent: null, requestId: null },
        { action: 'student.telegram_linked', entity: 'student', entityId: student.id },
        tx,
      );

      await this.limiter.reset(STUDENT_LINK_LIMIT, tgStr);

      return {
        result: 'linked',
        fullName: student.fullName,
      };
    });
  }

  private async checkPhoneMatch(
    tx: Tx,
    studentId: string,
    studentPhone: string | null,
    phone: string,
  ): Promise<boolean> {
    if (studentPhone === phone) return true;
    const [guardian] = await tx
      .select({ id: guardians.id })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(and(eq(studentGuardians.studentId, studentId), eq(guardians.phone, phone)))
      .limit(1);
    return guardian !== undefined;
  }

  private async resolveStudentUser(
    tx: Tx,
    telegramId: bigint,
    phone: string,
    studentFullName: string,
  ) {
    const [existingByTg] = await tx
      .select()
      .from(users)
      .where(eq(users.telegramId, telegramId))
      .for('update');

    if (existingByTg) {
      const [linkedStudent] = await tx
        .select({ id: students.id })
        .from(students)
        .where(eq(students.userId, existingByTg.id))
        .limit(1);
      if (linkedStudent) return 'already_linked';
      return existingByTg;
    }

    const [existingByPhone] = await tx
      .select()
      .from(users)
      .where(eq(users.phone, phone))
      .for('update');

    if (existingByPhone) {
      // Boshqa Telegram'ga bogʻlangan akkaunt (xodim — Telegram 2FA, T-122) oʻquvchi oqimida
      // qayta bogʻlanmaydi: Telegram almashtirish — faqat xodim/ota-ona oqimi orqali, auditli.
      if (existingByPhone.telegramId !== null) return 'in_use';
      const [linkedStudent] = await tx
        .select({ id: students.id })
        .from(students)
        .where(eq(students.userId, existingByPhone.id))
        .limit(1);
      if (linkedStudent) return 'in_use';

      await tx.update(users).set({ telegramId }).where(eq(users.id, existingByPhone.id));
      return existingByPhone;
    }

    const [created] = await tx
      .insert(users)
      .values({
        fullName: studentFullName,
        phone,
        telegramId,
        status: 'active',
      })
      .returning();
    if (!created) throw new Error('Foydalanuvchi yaratilmadi');
    return created;
  }

  private async isOwnTelegram(tx: Tx, userId: string, telegramId: bigint): Promise<boolean> {
    const [u] = await tx
      .select({ telegramId: users.telegramId })
      .from(users)
      .where(eq(users.id, userId));
    return u?.telegramId === telegramId;
  }

  private async attachStudentRole(tx: Tx, userId: string): Promise<void> {
    const [studentRole] = await tx.select().from(roles).where(eq(roles.code, 'student'));
    if (studentRole) {
      await tx.insert(userRoles).values({ userId, roleId: studentRole.id }).onConflictDoNothing();
    }
  }
}
