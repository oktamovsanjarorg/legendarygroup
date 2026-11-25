import { Inject, Injectable } from '@nestjs/common';
import { attendance, type Database, groups, lessons, users } from '@lg/db';
import { calculateAttendanceRateBp } from '@lg/domain';
import { and, eq, gte, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { DateFilter } from './reports-revenue.repository.js';
import { cohortRetention, teacherPerformance } from './reports-retention.js';

@Injectable()
export class ReportsPerformanceRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /** Davomat hisoboti: guruh yoki ustoz kesimida */
  async getAttendanceReport(
    branchId: string,
    groupBy: 'group' | 'teacher',
    from?: string,
    to?: string,
  ) {
    const conditions = [eq(groups.branchId, branchId)];
    if (from) conditions.push(gte(lessons.date, from));
    if (to) conditions.push(lte(lessons.date, to));

    if (groupBy === 'teacher') {
      return this.getAttendanceByTeacher(conditions);
    }
    return this.getAttendanceByGroup(conditions);
  }

  private async getAttendanceByTeacher(conditions: ReturnType<typeof eq>[]) {
    const rows = await this.db
      .select({
        id: users.id,
        name: users.fullName,
        totalLessons: sql<number>`count(distinct ${lessons.id})::int`,
        presentCount: sql<number>`count(case when ${attendance.status} = 'present' then 1 end)::int`,
        absentCount: sql<number>`count(case when ${attendance.status} = 'absent' then 1 end)::int`,
        excusedCount: sql<number>`count(case when ${attendance.status} = 'excused' then 1 end)::int`,
        lateCount: sql<number>`count(case when ${attendance.status} = 'late' then 1 end)::int`,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .innerJoin(users, eq(users.id, lessons.teacherId))
      .where(and(...conditions))
      .groupBy(users.id, users.fullName);

    return rows.map((r) => {
      const total = r.presentCount + r.absentCount + r.excusedCount + r.lateCount;
      return {
        id: r.id,
        name: r.name,
        totalLessons: Number(r.totalLessons),
        presentCount: Number(r.presentCount),
        absentCount: Number(r.absentCount),
        excusedCount: Number(r.excusedCount),
        lateCount: Number(r.lateCount),
        attendancePercentBp: calculateAttendanceRateBp(r.presentCount, r.lateCount, total),
      };
    });
  }

  private async getAttendanceByGroup(conditions: ReturnType<typeof eq>[]) {
    const rows = await this.db
      .select({
        id: groups.id,
        name: groups.name,
        totalLessons: sql<number>`count(distinct ${lessons.id})::int`,
        presentCount: sql<number>`count(case when ${attendance.status} = 'present' then 1 end)::int`,
        absentCount: sql<number>`count(case when ${attendance.status} = 'absent' then 1 end)::int`,
        excusedCount: sql<number>`count(case when ${attendance.status} = 'excused' then 1 end)::int`,
        lateCount: sql<number>`count(case when ${attendance.status} = 'late' then 1 end)::int`,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .innerJoin(groups, eq(groups.id, lessons.groupId))
      .where(and(...conditions))
      .groupBy(groups.id, groups.name);

    return rows.map((r) => {
      const total = r.presentCount + r.absentCount + r.excusedCount + r.lateCount;
      return {
        id: r.id,
        name: r.name,
        totalLessons: Number(r.totalLessons),
        presentCount: Number(r.presentCount),
        absentCount: Number(r.absentCount),
        excusedCount: Number(r.excusedCount),
        lateCount: Number(r.lateCount),
        attendancePercentBp: calculateAttendanceRateBp(r.presentCount, r.lateCount, total),
      };
    });
  }

  /** Kohorta saqlanish (retention) hisoboti — haqiqiy faol yozilishlar bo'yicha. */
  getCohortReport(branchId: string, monthsCount: number, today: string) {
    return cohortRetention(this.db, branchId, monthsCount, today);
  }

  /** Ustoz samaradorligi hisoboti */
  getTeacherPerformanceReport(branchId: string, filter: DateFilter, today: string) {
    return teacherPerformance(this.db, branchId, filter, today);
  }
}
