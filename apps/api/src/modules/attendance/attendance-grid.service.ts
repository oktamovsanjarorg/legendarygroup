import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { GroupAttendance, GroupAttendanceQueryInput } from '@lg/contracts';
import { attendance, type Database, enrollments, lessons, students } from '@lg/db';
import { and, asc, eq, gte, inArray, isNull, lte, or } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { GroupScopeService } from '../org/index.js';

/** 62 kundan uzun oraliq — jadval o'qib bo'lmas darajada keng (va og'ir so'rov). */
const MAX_DAYS = 62;

/**
 * W-12 davomat jadvali (T-112, FR-ATT-4/5): guruh darslari × o'quvchilar. Ko'rish qoidasi —
 * `getLessonAttendance` bilan bir xil: Admin/Director — hammasi, Ustoz — o'z guruhi.
 */
@Injectable()
export class AttendanceGridService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(GroupScopeService) private readonly groupScope: GroupScopeService,
  ) {}

  async grid(user: RequestUser, q: GroupAttendanceQueryInput): Promise<GroupAttendance> {
    if (user.role === 'teacher') await this.groupScope.assertVisible(user, q.groupId);
    else if (user.role !== 'admin' && user.role !== 'director')
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    const days = (Date.parse(q.to) - Date.parse(q.from)) / 86_400_000;
    if (!(days >= 0 && days <= MAX_DAYS))
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR');

    const ls = await this.db
      .select({
        id: lessons.id,
        date: lessons.date,
        startTime: lessons.startTime,
        status: lessons.status,
      })
      .from(lessons)
      .where(
        and(eq(lessons.groupId, q.groupId), gte(lessons.date, q.from), lte(lessons.date, q.to)),
      )
      .orderBy(asc(lessons.date), asc(lessons.startTime));
    const st = await this.db
      .selectDistinct({ id: students.id, name: students.fullName })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .where(
        and(
          eq(enrollments.groupId, q.groupId),
          lte(enrollments.startDate, q.to),
          or(isNull(enrollments.endDate), gte(enrollments.endDate, q.from)),
        ),
      )
      .orderBy(asc(students.fullName));
    const marks = ls.length
      ? await this.db
          .select({
            lessonId: attendance.lessonId,
            studentId: attendance.studentId,
            status: attendance.status,
          })
          .from(attendance)
          .where(
            inArray(
              attendance.lessonId,
              ls.map((l) => l.id),
            ),
          )
      : [];
    return {
      groupId: q.groupId,
      lessons: ls.map((l) => ({
        id: l.id,
        date: l.date,
        startTime: l.startTime,
        cancelled: l.status === 'cancelled',
      })),
      students: st,
      marks,
    };
  }
}
