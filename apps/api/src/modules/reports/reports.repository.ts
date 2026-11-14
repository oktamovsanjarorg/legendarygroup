import { Inject, Injectable } from '@nestjs/common';
import {
  courses,
  type Database,
  enrollments,
  groups,
  invoices,
  leads,
  ledgerEntries,
  paymentAllocations,
  payments,
  students,
} from '@lg/db';
import { calculateConversionRateBp, classifyDebtAgingBucket } from '@lg/domain';
import { and, desc, eq, gte, inArray, isNull, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { ReportsPerformanceRepository } from './reports-performance.repository.js';

export interface RevenueRowItem {
  id: string;
  name: string;
  totalRevenue: bigint;
  paymentCount: number;
  studentCount: number;
}

export interface DebtorDetailItem {
  studentId: string;
  studentName: string;
  studentCode: number;
  groupName: string | null;
  debt: bigint;
  daysOverdue: number;
  bucket: 'fresh' | 'overdue' | 'critical';
}

@Injectable()
export class ReportsRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(ReportsPerformanceRepository)
    private readonly performanceRepo: ReportsPerformanceRepository,
  ) {}

  /** Tungi rejimda materialized view'ni yangilaydi (AC: T-501) */
  async refreshMaterializedViews(): Promise<void> {
    await this.db.execute(sql`REFRESH MATERIALIZED VIEW mv_monthly_revenue;`);
  }

  /** 1. Daromad hisoboti */
  async getRevenueReport(
    branchId: string,
    groupBy: 'month' | 'course' | 'group' | 'teacher',
    from?: string,
    to?: string,
  ): Promise<RevenueRowItem[]> {
    if (groupBy === 'course') {
      return this.getRevenueByCourse(branchId);
    }
    return this.getRevenueByMonth(branchId, from, to);
  }

  private async getRevenueByMonth(branchId: string, from?: string, to?: string) {
    const conditions = [
      eq(payments.branchId, branchId),
      sql`${payments.amount} > 0`,
      isNull(payments.reversalOf),
    ];
    if (from)
      conditions.push(
        gte(sql`to_char(${payments.paidAt} AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM')`, from),
      );
    if (to)
      conditions.push(
        lte(sql`to_char(${payments.paidAt} AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM')`, to),
      );

    const rows = await this.db
      .select({
        period: sql<string>`to_char(${payments.paidAt} AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM')`,
        totalRevenue: sql<bigint>`coalesce(sum(${payments.amount}), 0)`,
        paymentCount: sql<number>`count(${payments.id})::int`,
        studentCount: sql<number>`count(distinct ${payments.studentId})::int`,
      })
      .from(payments)
      .where(and(...conditions))
      .groupBy(sql`to_char(${payments.paidAt} AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM')`)
      .orderBy(desc(sql`to_char(${payments.paidAt} AT TIME ZONE 'Asia/Tashkent', 'YYYY-MM')`));

    return rows.map((r) => ({
      id: r.period,
      name: r.period,
      totalRevenue: BigInt(r.totalRevenue),
      paymentCount: Number(r.paymentCount),
      studentCount: Number(r.studentCount),
    }));
  }

  private async getRevenueByCourse(branchId: string) {
    const rows = await this.db
      .select({
        id: courses.id,
        name: courses.name,
        totalRevenue: sql<bigint>`coalesce(sum(${paymentAllocations.amount}), 0)`,
        paymentCount: sql<number>`count(distinct ${paymentAllocations.paymentId})::int`,
        studentCount: sql<number>`count(distinct ${payments.studentId})::int`,
      })
      .from(paymentAllocations)
      .innerJoin(payments, eq(payments.id, paymentAllocations.paymentId))
      .innerJoin(
        enrollments,
        eq(enrollments.id, sql`NULLIF(${paymentAllocations.invoiceLineId}, NULL)::uuid`),
      )
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .innerJoin(courses, eq(courses.id, groups.courseId))
      .where(and(eq(payments.branchId, branchId), isNull(payments.reversalOf)))
      .groupBy(courses.id, courses.name);

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      totalRevenue: BigInt(r.totalRevenue),
      paymentCount: Number(r.paymentCount),
      studentCount: Number(r.studentCount),
    }));
  }

  /** 2. Qarzdorlik yoshi (aging) hisoboti */
  async getDebtAgingReport(branchId: string, today: string): Promise<DebtorDetailItem[]> {
    const rawDebtors = await this.db
      .select({
        id: students.id,
        code: students.code,
        fullName: students.fullName,
        debt: sql<bigint>`coalesce(sum(${ledgerEntries.amount}), 0)`,
      })
      .from(students)
      .innerJoin(ledgerEntries, eq(ledgerEntries.studentId, students.id))
      .where(and(eq(students.branchId, branchId), isNull(students.archivedAt)))
      .groupBy(students.id, students.code, students.fullName)
      .having(sql`sum(${ledgerEntries.amount}) > 0`);

    if (rawDebtors.length === 0) return [];
    const studentIds = rawDebtors.map((d) => d.id);
    const dueMap = await this.fetchOpenInvoiceDueDates(studentIds);
    const groupMap = await this.fetchActiveGroupNames(studentIds, today);

    return rawDebtors.map((d) => {
      const dueDate = dueMap.get(d.id);
      let daysOverdue = 0;
      if (dueDate && dueDate < today) {
        const diffMs = new Date(today).getTime() - new Date(dueDate).getTime();
        daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      }
      return {
        studentId: d.id,
        studentName: d.fullName,
        studentCode: Number(d.code),
        groupName: groupMap.get(d.id) ?? null,
        debt: BigInt(d.debt),
        daysOverdue,
        bucket: classifyDebtAgingBucket(daysOverdue),
      };
    });
  }

  private async fetchOpenInvoiceDueDates(studentIds: string[]): Promise<Map<string, string>> {
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
        ),
      )
      .groupBy(invoices.studentId);
    return new Map(rows.map((i) => [i.studentId, i.minDueDate]));
  }

  private async fetchActiveGroupNames(
    studentIds: string[],
    today: string,
  ): Promise<Map<string, string>> {
    const rows = await this.db
      .select({
        studentId: enrollments.studentId,
        groupName: groups.name,
      })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          inArray(enrollments.studentId, studentIds),
          lte(enrollments.startDate, today),
          sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${today})`,
        ),
      );
    return new Map(rows.map((g) => [g.studentId, g.groupName]));
  }

  /** 3. Davomat hisoboti */
  async getAttendanceReport(
    branchId: string,
    groupBy: 'group' | 'teacher',
    from?: string,
    to?: string,
  ) {
    return this.performanceRepo.getAttendanceReport(branchId, groupBy, from, to);
  }

  /** 4. Kohorta hisoboti */
  async getCohortReport(branchId: string, monthsCount: number) {
    return this.performanceRepo.getCohortReport(branchId, monthsCount);
  }

  /** 5. Lid konversiyasi hisoboti */
  async getLeadsConversionReport(branchId: string, from?: string, to?: string) {
    const conditions = [eq(leads.branchId, branchId)];
    if (from) conditions.push(gte(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`, from));
    if (to) conditions.push(lte(sql`to_char(${leads.createdAt}, 'YYYY-MM-DD')`, to));

    const rows = await this.db
      .select({
        source: sql<string>`coalesce(${leads.source}, 'boshqa')`,
        totalLeads: sql<number>`count(${leads.id})::int`,
        contactedCount: sql<number>`count(case when ${leads.status} in ('contacted', 'trial', 'won') then 1 end)::int`,
        trialCount: sql<number>`count(case when ${leads.status} in ('trial', 'won') then 1 end)::int`,
        wonCount: sql<number>`count(case when ${leads.status} = 'won' then 1 end)::int`,
      })
      .from(leads)
      .where(and(...conditions))
      .groupBy(sql`coalesce(${leads.source}, 'boshqa')`);

    return rows.map((r) => ({
      source: r.source,
      totalLeads: Number(r.totalLeads),
      contactedCount: Number(r.contactedCount),
      trialCount: Number(r.trialCount),
      wonCount: Number(r.wonCount),
      conversionPercentBp: calculateConversionRateBp(r.wonCount, r.totalLeads),
    }));
  }

  /** 6. Ustoz samaradorligi hisoboti */
  async getTeacherPerformanceReport(branchId: string) {
    return this.performanceRepo.getTeacherPerformanceReport(branchId);
  }
}
