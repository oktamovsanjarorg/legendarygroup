import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type Database, enrollments, guardians, studentGuardians, students } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, eq, gte, inArray, isNull, lte, or, type SQL, sql } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { GroupScopeService } from '../org/index.js';

/** Ko'rish doirasi: `all` — cheklovsiz, aks holda `students.id` sharti. */
export type StudentScope = { kind: 'all' } | { kind: 'some'; where: SQL };

const NOTHING: StudentScope = { kind: 'some', where: sql`false` };

/**
 * O'quvchi scope'i (02 §3, T-105):
 * - Director/Admin — hammasi;
 * - Ota-ona — `student_guardians` orqali bog'langan farzandlari (arxivdagisi ham — tarix/qarz
 *   ko'rinadi); bog'lanish uzilsa — darhol yopiladi (har so'rovda DB'dan);
 * - Ustoz — bugun amaldagi guruhlariga (Q-64) **bugun** yozilgan o'quvchilar (BR-32, T-106);
 *   guruhdan chiqqan o'quvchi ko'rinmaydi;
 * - boshqalar — hech kim (deny by default).
 */
@Injectable()
export class StudentScopeService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(GroupScopeService) private readonly groups: GroupScopeService,
  ) {}

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
    if (user.role === 'teacher') {
      const groupIds = this.groups.activeAssignments(user.id);
      return { kind: 'some', where: inArray(students.id, this.enrolledOn(groupIds)) };
    }
    return NOTHING;
  }

  /** `groupIds` guruhlariga bugun yozilgan o'quvchilar (subquery). */
  enrolledOn(groupIds: string[] | ReturnType<GroupScopeService['activeAssignments']>) {
    const today = this.clock.today();
    return this.db
      .select({ id: enrollments.studentId })
      .from(enrollments)
      .where(
        and(
          inArray(enrollments.groupId, groupIds),
          lte(enrollments.startDate, today),
          or(isNull(enrollments.endDate), gte(enrollments.endDate, today)),
        ),
      );
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
