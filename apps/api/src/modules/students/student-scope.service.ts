import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type Database, guardians, studentGuardians, students } from '@lg/db';
import { and, eq, inArray, type SQL, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';

/** Ko'rish doirasi: `all` — cheklovsiz, aks holda `students.id` sharti. */
export type StudentScope = { kind: 'all' } | { kind: 'some'; where: SQL };

const NOTHING: StudentScope = { kind: 'some', where: sql`false` };

/**
 * O'quvchi scope'i (02 §3, T-105):
 * - Director/Admin — hammasi;
 * - Ota-ona — `student_guardians` orqali bog'langan farzandlari (arxivdagisi ham — tarix/qarz
 *   ko'rinadi); bog'lanish uzilsa — darhol yopiladi (har so'rovda DB'dan);
 * - Ustoz — hozir yozilgan o'quvchilari (`group_teachers` × `enrollments`, T-103/T-106 kengaytiradi);
 *   ungacha — hech kim (deny by default).
 */
@Injectable()
export class StudentScopeService {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  scopeFor(user: RequestUser): StudentScope {
    if (user.role === 'director' || user.role === 'admin') return { kind: 'all' };
    if (user.role === 'guardian') {
      const own = this.db
        .select({ id: studentGuardians.studentId })
        .from(studentGuardians)
        .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
        .where(eq(guardians.userId, user.id));
      return { kind: 'some', where: inArray(students.id, own) };
    }
    return NOTHING;
  }

  /** Scope'dan tashqari — 404 (mavjudligi oshkor qilinmaydi). */
  async assertVisible(user: RequestUser, studentId: string): Promise<void> {
    const scope = this.scopeFor(user);
    const where =
      scope.kind === 'all'
        ? eq(students.id, studentId)
        : and(eq(students.id, studentId), scope.where);
    const [row] = await this.db.select({ id: students.id }).from(students).where(where);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  /** Ota-ona sifatida kirgan foydalanuvchining `guardians.id`si (field-level filtr uchun). */
  async guardianIdOf(user: RequestUser): Promise<string | null> {
    if (user.role !== 'guardian') return null;
    const [g] = await this.db
      .select({ id: guardians.id })
      .from(guardians)
      .where(eq(guardians.userId, user.id));
    return g?.id ?? null;
  }
}
