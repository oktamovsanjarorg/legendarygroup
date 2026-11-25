import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  enrollments,
  groups,
  invoiceOutstandingSql,
  invoices,
  leads,
  ledgerEntries,
  students,
} from '@lg/db';
import { calculateConversionRateBp, classifyDebtAgingBucket } from '@lg/domain';
import { and, eq, inArray, lte, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { ReportsPerformanceRepository } from './reports-performance.repository.js';
import {
  type DateFilter,
  type RevenueReport,
  ReportsRevenueRepository,
} from './reports-revenue.repository.js';

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
    @Inject(ReportsRevenueRepository) private readonly revenueRepo: ReportsRevenueRepository,
  ) {}

  /** Tungi rejimda materialized view'ni yangilaydi (AC: T-501) */
  async refreshMaterializedViews(): Promise<void> {
    await this.db.execute(sql`REFRESH MATERIALIZED VIEW mv_monthly_revenue;`);
  }

  /** 1. Daromad hisoboti (sof, davr va kesim bo'yicha). */
  getRevenueReport(
    branchId: string,
    groupBy: 'month' | 'course' | 'group' | 'teacher',
    filter: DateFilter,
  ): Promise<RevenueReport> {
    if (groupBy === 'month') return this.revenueRepo.byMonth(branchId, filter);
    return this.revenueRepo.byDimension(branchId, groupBy, filter);
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
      // T-165: arxivdagi qarzdor ham (qarzdorlar ro'yxati va dashboard jami bilan bir xil).
      .where(eq(students.branchId, branchId))
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
          // BR-20: to'lab bo'lingan qoldiqsiz hisob kechikish sanalmaydi (MS-08 bilan bir xil).
          sql`${invoiceOutstandingSql(invoices.id, invoices.total)} > 0`,
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
    { from, to }: DateFilter,
  ) {
    return this.performanceRepo.getAttendanceReport(branchId, groupBy, from, to);
  }

  /** 4. Kohorta hisoboti */
  async getCohortReport(branchId: string, monthsCount: number, today: string) {
    return this.performanceRepo.getCohortReport(branchId, monthsCount, today);
  }

  /** 5. Lid konversiyasi hisoboti */
  async getLeadsConversionReport(branchId: string, { from, to }: DateFilter) {
    const conditions = [eq(leads.branchId, branchId)];
    const day = sql`(${leads.createdAt} AT TIME ZONE 'Asia/Tashkent')::date`;
    if (from) conditions.push(sql`${day} >= ${from}::date`);
    if (to) conditions.push(sql`${day} <= ${to}::date`);

    const rows = await this.db
      .select({
        source: sql<string>`coalesce(${leads.source}, 'other')`,
        totalLeads: sql<number>`count(${leads.id})::int`,
        contactedCount: sql<number>`count(case when ${leads.status} in ('contacted', 'trial', 'won') then 1 end)::int`,
        trialCount: sql<number>`count(case when ${leads.status} in ('trial', 'won') then 1 end)::int`,
        wonCount: sql<number>`count(case when ${leads.status} = 'won' then 1 end)::int`,
      })
      .from(leads)
      .where(and(...conditions))
      .groupBy(sql`1`)
      .orderBy(sql`2 desc`);

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
  getTeacherPerformanceReport(branchId: string, filter: DateFilter, today: string) {
    return this.performanceRepo.getTeacherPerformanceReport(branchId, filter, today);
  }
}
