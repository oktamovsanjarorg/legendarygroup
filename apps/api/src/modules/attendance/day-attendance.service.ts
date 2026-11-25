import { Inject, Injectable } from '@nestjs/common';
import type { DayAttendance } from '@lg/contracts';
import { attendance, type Database, enrollments, groups, lessons, students, users } from '@lg/db';
import { hhmm } from '@lg/domain';
import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

const count = (cond: ReturnType<typeof sql>) =>
  sql<number>`(select count(*)::int from ${attendance} a where a.lesson_id = ${lessons.id} ${cond})`;

/** MS-13 Davomat nazorati (T-137, FR-ATT-5): kun darslari, kim belgilanmagan, kim kelmagan. */
@Injectable()
export class DayAttendanceService {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async day(date: string): Promise<DayAttendance> {
    const rows = await this.db
      .select({
        lessonId: lessons.id,
        groupId: lessons.groupId,
        groupName: groups.name,
        teacherName: users.fullName,
        startTime: lessons.startTime,
        endTime: lessons.endTime,
        status: lessons.status,
        expected: sql<number>`(select count(*)::int from ${enrollments} e
          where e.group_id = ${lessons.groupId} and e.start_date <= ${lessons.date}
          and (e.end_date is null or e.end_date >= ${lessons.date}))`,
        marked: count(sql``),
        came: count(sql`and a.status in ('present', 'late')`),
      })
      .from(lessons)
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .leftJoin(users, eq(users.id, lessons.teacherId))
      .where(eq(lessons.date, date))
      .orderBy(asc(lessons.startTime), asc(groups.name));
    return {
      date,
      lessons: rows.map(({ status, ...r }) => ({
        ...r,
        startTime: hhmm(r.startTime),
        endTime: hhmm(r.endTime),
        cancelled: status === 'cancelled',
      })),
      absentees: await this.absentees(date),
    };
  }

  private async absentees(date: string): Promise<DayAttendance['absentees']> {
    const rows = await this.db
      .select({
        lessonId: attendance.lessonId,
        studentId: attendance.studentId,
        studentName: students.fullName,
        groupName: groups.name,
        status: attendance.status,
        lateMinutes: attendance.lateMinutes,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .innerJoin(students, eq(students.id, attendance.studentId))
      .where(
        and(
          eq(lessons.date, date),
          ne(lessons.status, 'cancelled'),
          inArray(attendance.status, ['absent', 'late', 'excused']),
        ),
      )
      .orderBy(asc(attendance.status), asc(students.fullName));
    return rows.flatMap((r) => (r.status === 'present' ? [] : [{ ...r, status: r.status }]));
  }
}
