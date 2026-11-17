import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { type Database, enrollments, groups, groupTeachers, students } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, eq, gte, inArray, isNull, lte, or, type SQL, sql } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';

export type GroupScope = { kind: 'all' } | { kind: 'some'; where: SQL };

/**
 * Guruh scope'i (02 §3, T-103):
 * - Director/Admin — hammasi;
 * - Ustoz — `group_teachers`da **bugun** (Asia/Tashkent) amaldagi biriktirishlari (asosiy yoki
 *   yordamchi). Guruhdan ketgan ustoz eski guruhni ko'rmaydi (Q-64). O'rinbosar — faqat dars orqali (LessonsQueryService);
 * - boshqalar — hech narsa (deny by default).
 */
@Injectable()
export class GroupScopeService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  scopeFor(user: RequestUser): GroupScope {
    if (user.role === 'director' || user.role === 'admin') return { kind: 'all' };
    if (user.role === 'teacher') {
      return { kind: 'some', where: inArray(groups.id, this.activeAssignments(user.id)) };
    }
    if (user.role === 'student') {
      const studentGroups = this.db
        .select({ id: enrollments.groupId })
        .from(enrollments)
        .innerJoin(students, eq(students.id, enrollments.studentId))
        .where(eq(students.userId, user.id));
      return { kind: 'some', where: inArray(groups.id, studentGroups) };
    }
    return { kind: 'some', where: sql`false` };
  }

  /** Ustozning bugungi faol guruhlari (boshqa modullar — davomat, baholar — uchun ham). */
  activeAssignments(teacherId: string) {
    const today = this.clock.today();
    return this.db
      .select({ id: groupTeachers.groupId })
      .from(groupTeachers)
      .where(
        and(
          eq(groupTeachers.teacherId, teacherId),
          lte(groupTeachers.fromDate, today),
          or(isNull(groupTeachers.toDate), gte(groupTeachers.toDate, today)),
        ),
      );
  }

  /** Scope'dan tashqari — 404 (mavjudligi oshkor qilinmaydi). */
  async assertVisible(user: RequestUser, groupId: string): Promise<void> {
    const scope = this.scopeFor(user);
    const where =
      scope.kind === 'all' ? eq(groups.id, groupId) : and(eq(groups.id, groupId), scope.where);
    const [row] = await this.db.select({ id: groups.id }).from(groups).where(where);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
  }

  /**
   * Guruhni boshqarish (test, import, e'lon qilish — Q-62): Director/Admin yoki guruhning bugun
   * amaldagi **asosiy** ustozi. Ko'rinmasa — 404, yordamchi ustoz — 403.
   */
  async assertCanManage(user: RequestUser, groupId: string): Promise<void> {
    await this.assertVisible(user, groupId);
    if (user.role !== 'teacher') return;
    const today = this.clock.today();
    const [main] = await this.db
      .select({ id: groupTeachers.groupId })
      .from(groupTeachers)
      .where(
        and(
          eq(groupTeachers.groupId, groupId),
          eq(groupTeachers.teacherId, user.id),
          eq(groupTeachers.role, 'main'),
          lte(groupTeachers.fromDate, today),
          or(isNull(groupTeachers.toDate), gte(groupTeachers.toDate, today)),
        ),
      );
    if (!main) throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }
}
