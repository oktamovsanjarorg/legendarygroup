import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_BRANCH_ID,
  type DebtAgingResponse,
  PDF_MIME,
  type ReportType,
  type RevenueReportResponse,
  XLSX_MIME,
} from '@lg/contracts';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { PermissionsService } from '../rbac/index.js';
import { ReportsExporterService } from './reports-exporter.service.js';
import { monthEnd } from './reports-retention.js';
import { type ReportDataMap, reportTable } from './reports-table.js';
import { ReportsRepository } from './reports.repository.js';

export interface ReportFilter {
  groupBy?: 'month' | 'course' | 'group' | 'teacher';
  from?: string;
  to?: string;
  branchId?: string;
}

export interface AttendanceFilterParams extends Omit<ReportFilter, 'groupBy'> {
  groupBy?: 'group' | 'teacher';
}

export interface ReportFile {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  title: string;
  subtitle: string;
}

const COHORT_MONTHS = 6;

/** `YYYY-MM` chegara → oyning birinchi/oxirgi kuni (W-26 oy bilan so'raydi). */
function monthBounds({ from, to }: ReportFilter): { from?: string; to?: string } {
  return {
    from: from?.length === 7 ? `${from}-01` : from,
    to: to?.length === 7 ? monthEnd(to, '') : to,
  };
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(ReportsRepository) private readonly repo: ReportsRepository,
    @Inject(ReportsExporterService) private readonly exporter: ReportsExporterService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  /** Hisobot turi bo'yicha ma'lumot — eksport va chatga yuborish bitta yo'ldan. */
  private async reportData<K extends ReportType>(
    type: K,
    actor: RequestUser,
    f: ReportFilter,
  ): Promise<ReportDataMap[K]> {
    const load: { [T in ReportType]: () => Promise<ReportDataMap[T]> } = {
      revenue: () => this.getRevenueReport(actor, f),
      'debt-aging': () => this.getDebtAgingReport(actor, f.branchId),
      attendance: () =>
        this.getAttendanceReport(actor, {
          ...f,
          groupBy: f.groupBy === 'teacher' ? 'teacher' : 'group',
        }),
      cohort: () => this.getCohortReport(actor, COHORT_MONTHS, f.branchId),
      leads: () => this.getLeadsConversionReport(actor, f),
      'teacher-performance': () => this.getTeacherPerformanceReport(actor, f),
    };
    return load[type]();
  }

  /**
   * FR-FIN-3: moliyaviy hisobotlar (daromad, qarzdorlik) eksporti — endpoint'lari bilan bir xil
   * `finance.view`. Eksport marshruti umumiy (`stats.operational`), shuning uchun turi bo'yicha shu yerda.
   */
  private async assertCanExport(actor: RequestUser, type: ReportType): Promise<void> {
    if (type !== 'revenue' && type !== 'debt-aging') return;
    const perms = await this.permissions.forUser(actor.id, actor.role, actor.pv);
    if (!perms.has('finance.view')) throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
  }

  private resolveBranchId(_actor: RequestUser, branchId?: string): string {
    return branchId ?? DEFAULT_BRANCH_ID;
  }

  /** 1. Daromad hisoboti */
  async getRevenueReport(
    actor: RequestUser,
    params: ReportFilter = {},
  ): Promise<RevenueReportResponse> {
    const targetBranch = this.resolveBranchId(actor, params.branchId);
    const report = await this.repo.getRevenueReport(
      targetBranch,
      params.groupBy ?? 'month',
      monthBounds(params),
    );
    return {
      items: report.items.map((r) => ({
        id: r.id,
        name: r.name,
        totalRevenue: r.totalRevenue.toString(),
        paymentCount: r.paymentCount,
        studentCount: r.studentCount,
      })),
      totalRevenue: report.totalRevenue.toString(),
      totalPayments: report.totalPayments,
    };
  }

  /** 2. Qarzdorlik yoshi (aging) hisoboti */
  async getDebtAgingReport(actor: RequestUser, branchId?: string): Promise<DebtAgingResponse> {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const today = this.clock.today();
    const debtors = await this.repo.getDebtAgingReport(targetBranch, today);

    let totalDebt = 0n;
    let freshCount = 0;
    let freshDebt = 0n;
    let overdueCount = 0;
    let overdueDebt = 0n;
    let criticalCount = 0;
    let criticalDebt = 0n;

    for (const d of debtors) {
      totalDebt += d.debt;
      if (d.bucket === 'fresh') {
        freshCount += 1;
        freshDebt += d.debt;
      } else if (d.bucket === 'overdue') {
        overdueCount += 1;
        overdueDebt += d.debt;
      } else {
        criticalCount += 1;
        criticalDebt += d.debt;
      }
    }

    return {
      buckets: {
        fresh: { studentCount: freshCount, totalDebt: freshDebt.toString() },
        overdue: { studentCount: overdueCount, totalDebt: overdueDebt.toString() },
        critical: { studentCount: criticalCount, totalDebt: criticalDebt.toString() },
      },
      totalDebt: totalDebt.toString(),
      totalDebtors: debtors.length,
      debtors: debtors.map((d) => ({
        studentId: d.studentId,
        studentName: d.studentName,
        studentCode: d.studentCode,
        groupName: d.groupName,
        debt: d.debt.toString(),
        daysOverdue: d.daysOverdue,
        bucket: d.bucket,
      })),
    };
  }

  /** 3. Davomat hisoboti */
  async getAttendanceReport(actor: RequestUser, params: AttendanceFilterParams = {}) {
    const targetBranch = this.resolveBranchId(actor, params.branchId);
    const items = await this.repo.getAttendanceReport(
      targetBranch,
      params.groupBy ?? 'group',
      params,
    );
    const totalPresent = items.reduce((acc, it) => acc + it.presentCount, 0);
    const totalLate = items.reduce((acc, it) => acc + it.lateCount, 0);
    const totalAll = items.reduce(
      (acc, it) => acc + it.presentCount + it.absentCount + it.excusedCount + it.lateCount,
      0,
    );
    const overallAttendancePercentBp =
      totalAll > 0 ? Math.round(((totalPresent + totalLate * 0.5) / totalAll) * 10000) : 0;

    return { items, overallAttendancePercentBp };
  }

  /** 4. Kohorta hisoboti */
  async getCohortReport(actor: RequestUser, monthsCount: number, branchId?: string) {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const cohorts = await this.repo.getCohortReport(targetBranch, monthsCount, this.clock.today());
    return { cohorts };
  }

  /** 5. Lid konversiyasi hisoboti */
  async getLeadsConversionReport(actor: RequestUser, f: ReportFilter = {}) {
    const targetBranch = this.resolveBranchId(actor, f.branchId);
    const bySource = await this.repo.getLeadsConversionReport(targetBranch, f);
    const totalLeads = bySource.reduce((acc, s) => acc + s.totalLeads, 0);
    const totalWon = bySource.reduce((acc, s) => acc + s.wonCount, 0);
    const overallConversionPercentBp =
      totalLeads > 0 ? Math.round((totalWon / totalLeads) * 10000) : 0;

    return {
      bySource,
      totalLeads,
      totalWon,
      overallConversionPercentBp,
    };
  }

  /** 6. Ustoz samaradorligi hisoboti */
  async getTeacherPerformanceReport(actor: RequestUser, f: ReportFilter = {}) {
    const targetBranch = this.resolveBranchId(actor, f.branchId);
    const items = await this.repo.getTeacherPerformanceReport(targetBranch, f, this.clock.today());
    return { items };
  }

  /** Materialized view yangilash */
  async refreshMaterializedViews(): Promise<void> {
    await this.repo.refreshMaterializedViews();
  }

  /** Hisobot fayli (Excel yoki PDF); moliyaviysi — `finance.view` (FR-FIN-3). */
  async exportReport(
    reportType: ReportType,
    format: 'excel' | 'pdf',
    actor: RequestUser,
    filter: ReportFilter = {},
  ): Promise<ReportFile> {
    await this.assertCanExport(actor, reportType);
    const data = await this.reportData(reportType, actor, filter);
    const today = this.clock.today();
    const table = reportTable(reportType, data, { ...filter, today });
    const base = { title: table.title, subtitle: table.subtitle };
    const name = `hisobot-${reportType}-${filter.to ?? today}`;
    if (format === 'excel')
      return {
        ...base,
        buffer: await this.exporter.exportToExcel(table),
        filename: `${name}.xlsx`,
        mimeType: XLSX_MIME,
      };
    return {
      ...base,
      buffer: await this.exporter.exportToPdf(table),
      filename: `${name}.pdf`,
      mimeType: PDF_MIME,
    };
  }
}
