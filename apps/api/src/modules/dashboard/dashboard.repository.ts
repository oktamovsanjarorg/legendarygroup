import {
  approvalRequests,
  attendance,
  type Database,
  enrollments,
  groups,
  ledgerEntries,
  lessons,
  payments,
  paymentSubmissions,
  rooms,
  students,
  users,
} from '@lg/db';
import { tashkentDayRange, tashkentMonthRange } from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, gte, isNotNull, isNull, lt, ne, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface TodayLessonRow {
  id: string;
  start: string;
  group: string;
  teacher: string;
  room: string;
}

@Injectable()
export class DashboardRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async getMonthlyRevenue(branchId: string, year: number, month: number): Promise<bigint> {
    const { start, end } = this.getMonthRange(year, month);
    const [row] = await this.db
      .select({ total: sql<bigint>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(eq(payments.branchId, branchId), gte(payments.paidAt, start), lt(payments.paidAt, end)),
      );
    return BigInt(row?.total ?? 0n);
  }

  async getDailyRevenues(
    branchId: string,
    year: number,
    month: number,
  ): Promise<{ day: number; amount: bigint }[]> {
    const { start, end } = this.getMonthRange(year, month);
    const rows = await this.db
      .select({
        day: sql<number>`EXTRACT(DAY FROM ${payments.paidAt} AT TIME ZONE 'Asia/Tashkent')::int`,
        amount: sql<bigint>`coalesce(sum(${payments.amount}), 0)`,
      })
      .from(payments)
      .where(
        and(eq(payments.branchId, branchId), gte(payments.paidAt, start), lt(payments.paidAt, end)),
      )
      .groupBy(sql`1`)
      .orderBy(sql`1`);

    return rows.map((r) => ({ day: Number(r.day), amount: BigInt(r.amount) }));
  }

  async getDayRevenue(branchId: string, ymd: string): Promise<bigint> {
    const { start, end } = tashkentDayRange(ymd);
    const [row] = await this.db
      .select({ total: sql<bigint>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(eq(payments.branchId, branchId), gte(payments.paidAt, start), lt(payments.paidAt, end)),
      );
    return BigInt(row?.total ?? 0n);
  }

  async getTotalDebt(branchId: string): Promise<bigint> {
    const rows = await this.db
      .select({ debt: sql<bigint>`coalesce(sum(${ledgerEntries.amount}), 0)` })
      .from(students)
      .innerJoin(ledgerEntries, eq(ledgerEntries.studentId, students.id))
      .where(and(eq(students.branchId, branchId), isNull(students.archivedAt)))
      .groupBy(students.id)
      .having(sql`sum(${ledgerEntries.amount}) > 0`);

    return rows.reduce((sum, r) => sum + BigInt(r.debt), 0n);
  }

  async getActiveStudentsCount(branchId: string, todayYmd: string): Promise<number> {
    const [row] = await this.db
      .select({ count: sql<number>`count(distinct ${enrollments.studentId})` })
      .from(enrollments)
      .innerJoin(groups, eq(enrollments.groupId, groups.id))
      .where(
        and(
          eq(groups.branchId, branchId),
          sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${todayYmd})`,
        ),
      );
    return Number(row?.count ?? 0);
  }

  /**
   * Bugungi davomat: foiz (keldi + kech / belgilangan), kelmaganlar soni va belgilanmagan
   * darslar — tugagan (Toshkent vaqti), bekor qilinmagan, davomati yo'q (FR-ATT-5).
   */
  async getTodayAttendanceStats(
    todayYmd: string,
    now: Date,
  ): Promise<{ attended: number; total: number; unmarked: number; absent: number }> {
    const [attRow] = await this.db
      .select({
        total: sql<number>`count(*)`,
        attended: sql<number>`count(*) filter (where ${attendance.status} IN ('present', 'late'))`,
        absent: sql<number>`count(*) filter (where ${attendance.status} = 'absent')`,
      })
      .from(attendance)
      .innerJoin(lessons, eq(attendance.lessonId, lessons.id))
      .where(eq(lessons.date, todayYmd));

    const [unmarkedRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(lessons)
      .where(
        and(
          eq(lessons.date, todayYmd),
          ne(lessons.status, 'cancelled'),
          sql`(${lessons.date} + ${lessons.endTime}) AT TIME ZONE 'Asia/Tashkent' <= ${now.toISOString()}::timestamptz`,
          sql`NOT EXISTS (SELECT 1 FROM ${attendance} WHERE ${attendance.lessonId} = ${lessons.id})`,
        ),
      );

    return {
      attended: Number(attRow?.attended ?? 0),
      total: Number(attRow?.total ?? 0),
      unmarked: Number(unmarkedRow?.count ?? 0),
      absent: Number(attRow?.absent ?? 0),
    };
  }

  async getStudentFlow(
    branchId: string,
    year: number,
    month: number,
  ): Promise<{ joined: number; left: number }> {
    const startYmd = `${year}-${String(month).padStart(2, '0')}-01`;
    const nextYear = month === 12 ? year + 1 : year;
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextStartYmd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

    const [joinedRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .innerJoin(groups, eq(enrollments.groupId, groups.id))
      .where(
        and(
          eq(groups.branchId, branchId),
          gte(enrollments.startDate, startYmd),
          lt(enrollments.startDate, nextStartYmd),
        ),
      );

    const [leftRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(enrollments)
      .innerJoin(groups, eq(enrollments.groupId, groups.id))
      .where(
        and(
          eq(groups.branchId, branchId),
          isNotNull(enrollments.endDate),
          gte(enrollments.endDate, startYmd),
          lt(enrollments.endDate, nextStartYmd),
        ),
      );

    return { joined: Number(joinedRow?.count ?? 0), left: Number(leftRow?.count ?? 0) };
  }

  async getPendingCounts(branchId: string): Promise<{ queue: number; approvals: number }> {
    const [queueRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(paymentSubmissions)
      .where(
        and(
          eq(paymentSubmissions.branchId, branchId),
          eq(paymentSubmissions.status, 'pending_review'),
        ),
      );

    const [appRow] = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(approvalRequests)
      .where(and(eq(approvalRequests.branchId, branchId), eq(approvalRequests.status, 'pending')));

    return { queue: Number(queueRow?.count ?? 0), approvals: Number(appRow?.count ?? 0) };
  }

  async getTodayLessons(branchId: string, todayYmd: string): Promise<TodayLessonRow[]> {
    const rows = await this.db
      .select({
        id: lessons.id,
        start: lessons.startTime,
        groupName: groups.name,
        teacherName: users.fullName,
        roomName: rooms.name,
      })
      .from(lessons)
      .innerJoin(groups, eq(lessons.groupId, groups.id))
      .leftJoin(users, eq(lessons.teacherId, users.id))
      .leftJoin(rooms, eq(lessons.roomId, rooms.id))
      .where(and(eq(groups.branchId, branchId), eq(lessons.date, todayYmd)))
      .orderBy(asc(lessons.startTime));

    return rows.map((r) => ({
      id: r.id,
      start: r.start,
      group: r.groupName,
      teacher: r.teacherName ?? 'Nomaʼlum',
      room: r.roomName ?? 'Xona',
    }));
  }

  private getMonthRange(year: number, month: number): { start: Date; end: Date } {
    return tashkentMonthRange(`${year}-${String(month).padStart(2, '0')}`);
  }
}
