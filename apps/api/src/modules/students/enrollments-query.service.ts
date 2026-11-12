import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { EnrollmentDto, RosterResult } from '@lg/contracts';
import { type Database, enrollmentFreezes, enrollments, students } from '@lg/db';
import { type Clock, enrollmentState } from '@lg/domain';
import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { GroupScopeService, GroupsQueryService } from '../org/index.js';
import { freezeSpan, toEnrollment } from './enrollments.serializer.js';
import { StudentScopeService } from './student-scope.service.js';

/** Enrollment'larni o'qish (T-106): o'quvchi tarixi, guruh ro'yxati sanada (BR-32). */
@Injectable()
export class EnrollmentsQueryService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(GroupScopeService) private readonly groupScope: GroupScopeService,
    @Inject(GroupsQueryService) private readonly groups: GroupsQueryService,
  ) {}

  /** O'quvchining barcha guruhlari (tarix bilan; FR-STU-3). Scope — o'quvchi bo'yicha. */
  async forStudent(user: RequestUser, studentId: string): Promise<EnrollmentDto[]> {
    await this.studentScope.assertVisible(user, studentId);
    const rows = await this.db
      .select()
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId))
      .orderBy(desc(enrollments.startDate));
    const freezes = await this.freezesOf(rows.map((r) => r.id));
    const names = await this.groups.namesOf(rows.map((r) => r.groupId));
    const today = this.clock.today();
    return rows.map((r) =>
      toEnrollment(
        r,
        names.get(r.groupId) ?? '—',
        freezes.filter((f) => f.enrollmentId === r.id),
        today,
      ),
    );
  }

  /** Guruh ro'yxati sanada: faqat o'sha kuni yozilganlar (BR-32). Ustozga — o'z guruhi. */
  async roster(user: RequestUser, groupId: string, date?: string): Promise<RosterResult> {
    await this.groupScope.assertVisible(user, groupId);
    const group = await this.groups.info(this.db, groupId);
    if (!group) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const day = date ?? this.clock.today();
    const rows = await this.db
      .select({ e: enrollments, code: students.code, fullName: students.fullName })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(
        and(
          eq(enrollments.groupId, groupId),
          lte(enrollments.startDate, day),
          or(isNull(enrollments.endDate), gte(enrollments.endDate, day)),
        ),
      )
      .orderBy(asc(students.fullName));
    const freezes = await this.freezesOf(rows.map((r) => r.e.id));
    return {
      date: day,
      capacity: group.maxStudents,
      items: rows.map((r) => ({
        enrollmentId: r.e.id,
        studentId: r.e.studentId,
        code: r.code,
        fullName: r.fullName,
        state: enrollmentState(
          { from: r.e.startDate, to: r.e.endDate },
          freezes.filter((f) => f.enrollmentId === r.e.id).map(freezeSpan),
          day,
        ),
      })),
    };
  }

  private async freezesOf(ids: string[]) {
    if (ids.length === 0) return [];
    return this.db
      .select()
      .from(enrollmentFreezes)
      .where(inArray(enrollmentFreezes.enrollmentId, ids))
      .orderBy(asc(enrollmentFreezes.fromDate));
  }
}
