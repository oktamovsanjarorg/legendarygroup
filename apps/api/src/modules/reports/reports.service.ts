import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_BRANCH_ID,
  type DebtAgingResponse,
  type ReportType,
  type RevenueReportResponse,
} from '@lg/contracts';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { ReportsExporterService } from './reports-exporter.service.js';
import { ReportsRepository } from './reports.repository.js';

export interface RevenueFilterParams {
  groupBy?: 'month' | 'course' | 'group' | 'teacher';
  from?: string;
  to?: string;
  branchId?: string;
}

export interface AttendanceFilterParams {
  groupBy?: 'group' | 'teacher';
  from?: string;
  to?: string;
  branchId?: string;
}

@Injectable()
export class ReportsService {
  constructor(
    @Inject(ReportsRepository) private readonly repo: ReportsRepository,
    @Inject(ReportsExporterService) private readonly exporter: ReportsExporterService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  private resolveBranchId(_actor: RequestUser, branchId?: string): string {
    return branchId ?? DEFAULT_BRANCH_ID;
  }

  /** 1. Daromad hisoboti */
  async getRevenueReport(
    actor: RequestUser,
    params: RevenueFilterParams = {},
  ): Promise<RevenueReportResponse> {
    const targetBranch = this.resolveBranchId(actor, params.branchId);
    const rows = await this.repo.getRevenueReport(
      targetBranch,
      params.groupBy ?? 'month',
      params.from,
      params.to,
    );

    let totalRevenue = 0n;
    let totalPayments = 0;
    for (const r of rows) {
      totalRevenue += r.totalRevenue;
      totalPayments += r.paymentCount;
    }

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        totalRevenue: r.totalRevenue.toString(),
        paymentCount: r.paymentCount,
        studentCount: r.studentCount,
      })),
      totalRevenue: totalRevenue.toString(),
      totalPayments,
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
      params.from,
      params.to,
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
    const cohorts = await this.repo.getCohortReport(targetBranch, monthsCount);
    return { cohorts };
  }

  /** 5. Lid konversiyasi hisoboti */
  async getLeadsConversionReport(
    actor: RequestUser,
    from?: string,
    to?: string,
    branchId?: string,
  ) {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const bySource = await this.repo.getLeadsConversionReport(targetBranch, from, to);
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
  async getTeacherPerformanceReport(actor: RequestUser, branchId?: string) {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const items = await this.repo.getTeacherPerformanceReport(targetBranch);
    return { items };
  }

  /** Materialized view yangilash */
  async refreshMaterializedViews(): Promise<void> {
    await this.repo.refreshMaterializedViews();
  }

  /** Eksport qilish (Excel yoki PDF) */
  async exportReport(
    reportType: ReportType,
    format: 'excel' | 'pdf',
    actor: RequestUser,
    branchId?: string,
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    let data: unknown;
    if (reportType === 'revenue') {
      data = await this.getRevenueReport(actor, { branchId });
    } else if (reportType === 'debt-aging') {
      data = await this.getDebtAgingReport(actor, branchId);
    } else if (reportType === 'attendance') {
      data = await this.getAttendanceReport(actor, { branchId });
    } else if (reportType === 'cohort') {
      data = await this.getCohortReport(actor, 6, branchId);
    } else if (reportType === 'leads') {
      data = await this.getLeadsConversionReport(actor, undefined, undefined, branchId);
    } else if (reportType === 'teacher-performance') {
      data = await this.getTeacherPerformanceReport(actor, branchId);
    } else {
      throw new AppException(HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
    }

    const dateStr = this.clock.today();
    if (format === 'excel') {
      const buffer = await this.exporter.exportToExcel(reportType, data);
      return {
        buffer,
        filename: `report-${reportType}-${dateStr}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      };
    }

    const buffer = await this.exporter.exportToPdf(reportType, data);
    return {
      buffer,
      filename: `report-${reportType}-${dateStr}.pdf`,
      mimeType: 'application/pdf',
    };
  }
}
