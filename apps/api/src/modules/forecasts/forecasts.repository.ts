import { Inject, Injectable } from '@nestjs/common';
import {
  attendance,
  type Database,
  enrollments,
  grades,
  groups,
  guardians,
  invoices,
  lessons,
  payments,
  roles,
  studentGuardians,
  students,
  userRoles,
  users,
} from '@lg/db';
import { addDays } from '@lg/domain';
import { and, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import type { BacktestMetrics, RawStudentChurnData } from './forecasts.types.js';

@Injectable()
export class ForecastsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /** Faol enrollmentlar soni va joriy oylik jami qiymatini oladi */
  async getActiveEnrollmentsMonthlyTotal(branchId: string, today: string) {
    const rows = await this.db
      .select({
        count: sql<number>`count(${enrollments.id})::int`,
        totalValue: sql<bigint>`coalesce(sum(${groups.monthlyPrice}), 0)`,
      })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          eq(groups.branchId, branchId),
          lte(enrollments.startDate, today),
          sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${today})`,
        ),
      );

    return {
      count: Number(rows[0]?.count ?? 0),
      totalValue: BigInt(rows[0]?.totalValue ?? 0n),
    };
  }

  /** Tarixiy to'lov yig'ilish koeffitsientini (bp) hisoblaydi */
  async getHistoricalCollectionRateBp(branchId: string): Promise<number> {
    const invRows = await this.db
      .select({ totalInvoiced: sql<bigint>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(eq(invoices.branchId, branchId));

    const totalInvoiced = BigInt(invRows[0]?.totalInvoiced ?? 0n);
    if (totalInvoiced <= 0n) return 9000;

    const payRows = await this.db
      .select({ totalPaid: sql<bigint>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.branchId, branchId),
          sql`${payments.amount} > 0`,
          isNull(payments.reversalOf),
        ),
      );

    const totalPaid = BigInt(payRows[0]?.totalPaid ?? 0n);
    const rate = Math.round(Number((totalPaid * 10000n) / totalInvoiced));
    return Math.max(5000, Math.min(10000, rate));
  }

  /** O'quvchilar bo'yicha ketish xavfi (churn) ma'lumotlarini to'playdi (BR-36) */
  async getStudentsChurnInputs(branchId: string, today: string): Promise<RawStudentChurnData[]> {
    const activeStudents = await this.fetchActiveStudentsWithGroup(branchId, today);
    if (activeStudents.length === 0) return [];

    const studentIds = activeStudents.map((s) => s.id);
    const delaysMap = await this.fetchPaymentDelays(studentIds, today);
    const botMap = await this.fetchBotUnresponsiveMap(studentIds);
    const attDropMap = await this.fetchAttendanceDrops(studentIds, today);
    const gradeDropMap = await this.fetchGradeDrops(studentIds, today);

    return activeStudents.map((s) => ({
      studentId: s.id,
      studentName: s.fullName,
      studentCode: Number(s.code),
      groupName: s.groupName,
      attendanceDropPercent: attDropMap.get(s.id) ?? 0,
      paymentDelayDays: delaysMap.get(s.id) ?? 0,
      gradeDropPercent: gradeDropMap.get(s.id) ?? 0,
      botUnresponsive: botMap.get(s.id) ?? false,
    }));
  }

  private async fetchActiveStudentsWithGroup(branchId: string, today: string) {
    return this.db
      .select({
        id: students.id,
        code: students.code,
        fullName: students.fullName,
        groupName: groups.name,
      })
      .from(students)
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          eq(students.branchId, branchId),
          isNull(students.archivedAt),
          lte(enrollments.startDate, today),
          sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${today})`,
        ),
      );
  }

  private async fetchPaymentDelays(
    studentIds: string[],
    today: string,
  ): Promise<Map<string, number>> {
    const rows = await this.db
      .select({
        studentId: invoices.studentId,
        minDueDate: sql<string>`min(${invoices.dueDate})`,
      })
      .from(invoices)
      .where(
        and(
          inArray(invoices.studentId, studentIds),
          inArray(invoices.status, ['open', 'partially_paid']),
          sql`${invoices.dueDate} < ${today}`,
        ),
      )
      .groupBy(invoices.studentId);

    const map = new Map<string, number>();
    for (const r of rows) {
      const diffMs = Date.parse(`${today}T00:00:00Z`) - Date.parse(`${r.minDueDate}T00:00:00Z`);
      map.set(r.studentId, Math.max(0, Math.floor(diffMs / 86400000)));
    }
    return map;
  }

  private async fetchBotUnresponsiveMap(studentIds: string[]): Promise<Map<string, boolean>> {
    const rows = await this.db
      .select({
        studentId: studentGuardians.studentId,
        hasUser: sql<boolean>`bool_or(${guardians.userId} IS NOT NULL)`,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(inArray(studentGuardians.studentId, studentIds))
      .groupBy(studentGuardians.studentId);

    const map = new Map<string, boolean>();
    for (const r of rows) map.set(r.studentId, !r.hasUser);
    return map;
  }

  /** Oxirgi 4 hafta va undan oldingi 4 haftadagi davomat pasayishini hisoblaydi */
  private async fetchAttendanceDrops(
    studentIds: string[],
    today: string,
  ): Promise<Map<string, number>> {
    const d28 = addDays(today, -28);
    const d56 = addDays(today, -56);

    const rows = await this.db
      .select({
        studentId: attendance.studentId,
        recTot: sql<number>`count(case when ${lessons.date} >= ${d28} and ${lessons.date} <= ${today} then 1 end)::int`,
        recPres: sql<number>`count(case when ${lessons.date} >= ${d28} and ${lessons.date} <= ${today} and ${attendance.status} in ('present', 'late') then 1 end)::int`,
        oldTot: sql<number>`count(case when ${lessons.date} >= ${d56} and ${lessons.date} < ${d28} then 1 end)::int`,
        oldPres: sql<number>`count(case when ${lessons.date} >= ${d56} and ${lessons.date} < ${d28} and ${attendance.status} in ('present', 'late') then 1 end)::int`,
      })
      .from(attendance)
      .innerJoin(lessons, eq(lessons.id, attendance.lessonId))
      .where(
        and(
          inArray(attendance.studentId, studentIds),
          gte(lessons.date, d56),
          lte(lessons.date, today),
        ),
      )
      .groupBy(attendance.studentId);

    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.oldTot > 0 && r.recTot > 0) {
        const oldRate = (r.oldPres / r.oldTot) * 100;
        const recRate = (r.recPres / r.recTot) * 100;
        map.set(r.studentId, Math.max(0, Math.round(oldRate - recRate)));
      }
    }
    return map;
  }

  /** Oxirgi 4 hafta va undan oldingi 4 haftadagi o'rtacha baho pasayishini hisoblaydi */
  private async fetchGradeDrops(studentIds: string[], today: string): Promise<Map<string, number>> {
    const d28 = addDays(today, -28);
    const d56 = addDays(today, -56);

    const rows = await this.db
      .select({
        studentId: grades.studentId,
        recAvg: sql<
          number | null
        >`avg(case when ${lessons.date} >= ${d28} and ${lessons.date} <= ${today} then ${grades.value} end)`,
        oldAvg: sql<
          number | null
        >`avg(case when ${lessons.date} >= ${d56} and ${lessons.date} < ${d28} then ${grades.value} end)`,
      })
      .from(grades)
      .innerJoin(lessons, eq(lessons.id, grades.lessonId))
      .where(
        and(
          inArray(grades.studentId, studentIds),
          gte(lessons.date, d56),
          lte(lessons.date, today),
        ),
      )
      .groupBy(grades.studentId);

    const map = new Map<string, number>();
    for (const r of rows) {
      if (r.oldAvg !== null && r.recAvg !== null) {
        map.set(r.studentId, Math.max(0, Math.round(Number(r.oldAvg) - Number(r.recAvg))));
      }
    }
    return map;
  }

  /** Guruh to'lishi ma'lumotlari */
  async getGroupOccupancies(branchId: string, today: string) {
    const activeGroups = await this.db
      .select({
        id: groups.id,
        name: groups.name,
        capacity: groups.maxStudents,
        currentActive: sql<number>`count(${enrollments.id})::int`,
      })
      .from(groups)
      .leftJoin(
        enrollments,
        and(
          eq(enrollments.groupId, groups.id),
          lte(enrollments.startDate, today),
          sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${today})`,
        ),
      )
      .where(and(eq(groups.branchId, branchId), sql`${groups.status} <> 'finished'`))
      .groupBy(groups.id, groups.name, groups.maxStudents);

    return activeGroups.map((g) => ({
      groupId: g.id,
      groupName: g.name,
      capacity: Number(g.capacity),
      currentActive: Number(g.currentActive),
    }));
  }

  /** O'tgan oy bo'yicha haqiqiy va prognoz ko'rsatkichlarni oladi (Backtest) */
  async getBacktestMetrics(
    bId: string,
    m: string,
    start: string,
    end: string,
  ): Promise<BacktestMetrics> {
    const invRow = await this.db
      .select({ total: sql<bigint>`coalesce(sum(${invoices.total}), 0)` })
      .from(invoices)
      .where(and(eq(invoices.branchId, bId), eq(invoices.period, m)));

    const payRow = await this.db
      .select({ total: sql<bigint>`coalesce(sum(${payments.amount}), 0)` })
      .from(payments)
      .where(
        and(
          eq(payments.branchId, bId),
          gte(sql`(${payments.paidAt} AT TIME ZONE 'Asia/Tashkent')::date`, start),
          lte(sql`(${payments.paidAt} AT TIME ZONE 'Asia/Tashkent')::date`, end),
          sql`${payments.amount} > 0`,
          isNull(payments.reversalOf),
        ),
      );

    const churnRow = await this.db
      .select({ count: sql<number>`count(${enrollments.id})::int` })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          eq(groups.branchId, bId),
          gte(enrollments.endDate, start),
          lte(enrollments.endDate, end),
        ),
      );

    return {
      predictedRevenue: BigInt(invRow[0]?.total ?? 0n),
      actualRevenue: BigInt(payRow[0]?.total ?? 0n),
      actualChurnCount: Number(churnRow[0]?.count ?? 0),
    };
  }

  /** Faol Director rolli foydalanuvchilarning Telegram chat ID lari */
  async getDirectorTelegramChatIds(): Promise<string[]> {
    const rows = await this.db
      .select({ telegramId: users.telegramId })
      .from(users)
      .innerJoin(userRoles, eq(userRoles.userId, users.id))
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(
        and(
          eq(roles.code, 'director'),
          sql`${users.telegramId} IS NOT NULL`,
          eq(users.status, 'active'),
        ),
      );
    return rows.flatMap((r) => (r.telegramId ? [r.telegramId.toString()] : []));
  }
}
