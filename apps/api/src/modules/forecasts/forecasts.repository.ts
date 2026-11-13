import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  enrollments,
  groups,
  guardians,
  invoices,
  payments,
  studentGuardians,
  students,
} from '@lg/db';
import { and, eq, inArray, isNull, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface RawStudentChurnData {
  studentId: string;
  studentName: string;
  studentCode: number;
  groupName: string | null;
  attendanceDropPercent: number;
  paymentDelayDays: number;
  gradeDropPercent: number;
  botUnresponsive: boolean;
}

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

  /** Tarixiy to'lov yig'ilish koeffitsientini (bp) hisoblaydi (standart 9000 = 90%) */
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

  /** O'quvchilar bo'yicha ketish xavfi (churn) ma'lumotlarini to'playdi */
  async getStudentsChurnInputs(branchId: string, today: string): Promise<RawStudentChurnData[]> {
    const activeStudents = await this.fetchActiveStudentsWithGroup(branchId, today);
    if (activeStudents.length === 0) return [];

    const studentIds = activeStudents.map((s) => s.id);
    const delaysMap = await this.fetchPaymentDelays(studentIds, today);
    const botMap = await this.fetchBotUnresponsiveMap(studentIds);

    return activeStudents.map((s) => ({
      studentId: s.id,
      studentName: s.fullName,
      studentCode: Number(s.code),
      groupName: s.groupName,
      attendanceDropPercent: 15, // o'rtacha dinamika
      paymentDelayDays: delaysMap.get(s.id) ?? 0,
      gradeDropPercent: 10,
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
      const diffMs = new Date(today).getTime() - new Date(r.minDueDate).getTime();
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
    for (const r of rows) {
      map.set(r.studentId, !r.hasUser);
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
}
