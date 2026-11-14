import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import {
  type AttendanceReportQuery,
  type AttendanceReportResponse,
  type CohortReportQuery,
  type CohortReportResponse,
  type DebtAgingQuery,
  type DebtAgingResponse,
  type LeadsConversionReportQuery,
  type LeadsConversionReportResponse,
  type ParentDigestQuery,
  type ParentDigestReport,
  REPORT_TYPES,
  type ReportType,
  type RevenueReportQuery,
  type RevenueReportResponse,
  type TeacherPerformanceReportQuery,
  type TeacherPerformanceReportResponse,
} from '@lg/contracts';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { AppException } from '../../common/errors/app.exception.js';
import { ParentDigestService } from './parent-digest.service.js';
import { ReportsService } from './reports.service.js';

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly service: ReportsService,
    @Inject(ParentDigestService) private readonly parentDigest: ParentDigestService,
  ) {}

  @Get('revenue')
  @RequirePermission('finance.view')
  @NoAudit('Daromad hisoboti')
  @ApiOperation({ summary: "FR-DASH-2: Daromad hisoboti (oy, kurs, guruh, ustoz bo'yicha)" })
  async getRevenueReport(
    @CurrentUser() actor: RequestUser,
    @Query() query: RevenueReportQuery,
  ): Promise<RevenueReportResponse> {
    return this.service.getRevenueReport(actor, {
      groupBy: query.groupBy ?? 'month',
      from: query.from,
      to: query.to,
      branchId: query.branchId,
    });
  }

  @Get('debt-aging')
  @RequirePermission('finance.view')
  @NoAudit('Qarzdorlik yoshi hisoboti')
  @ApiOperation({ summary: 'FR-DASH-2: Qarzdorlik yoshi (aging: 0-7, 8-30, 30+ kun)' })
  async getDebtAgingReport(
    @CurrentUser() actor: RequestUser,
    @Query() query: DebtAgingQuery,
  ): Promise<DebtAgingResponse> {
    return this.service.getDebtAgingReport(actor, query.branchId);
  }

  @Get('attendance')
  @RequirePermission('stats.operational')
  @NoAudit('Davomat hisoboti')
  @ApiOperation({ summary: "FR-DASH-2: Davomat hisoboti (guruh/ustoz bo'yicha)" })
  async getAttendanceReport(
    @CurrentUser() actor: RequestUser,
    @Query() query: AttendanceReportQuery,
  ): Promise<AttendanceReportResponse> {
    return this.service.getAttendanceReport(actor, {
      groupBy: query.groupBy ?? 'group',
      from: query.from,
      to: query.to,
      branchId: query.branchId,
    });
  }

  @Get('cohort')
  @RequirePermission('stats.operational')
  @NoAudit('Kohorta hisoboti')
  @ApiOperation({ summary: 'FR-DASH-2: Kohorta tahlili (oʻquvchi saqlanishi)' })
  async getCohortReport(
    @CurrentUser() actor: RequestUser,
    @Query() query: CohortReportQuery,
  ): Promise<CohortReportResponse> {
    return this.service.getCohortReport(actor, query.monthsCount ?? 6, query.branchId);
  }

  @Get('leads')
  @RequirePermission('stats.operational')
  @NoAudit('Lid konversiyasi hisoboti')
  @ApiOperation({ summary: 'FR-DASH-2: Lid konversiyasi hisoboti' })
  async getLeadsConversionReport(
    @CurrentUser() actor: RequestUser,
    @Query() query: LeadsConversionReportQuery,
  ): Promise<LeadsConversionReportResponse> {
    return this.service.getLeadsConversionReport(actor, query.from, query.to, query.branchId);
  }

  @Get('teacher-performance')
  @RequirePermission('stats.operational')
  @NoAudit('Ustoz samaradorligi hisoboti')
  @ApiOperation({ summary: 'FR-DASH-2: Ustoz samaradorligi hisoboti' })
  async getTeacherPerformanceReport(
    @CurrentUser() actor: RequestUser,
    @Query() query: TeacherPerformanceReportQuery,
  ): Promise<TeacherPerformanceReportResponse> {
    return this.service.getTeacherPerformanceReport(actor, query.branchId);
  }

  @Get(':reportType/export/excel')
  @RequirePermission('stats.operational')
  @NoAudit('Hisobotni Excel eksport qilish')
  @ApiOperation({ summary: 'FR-DASH-4: Hisobotni Excel (.xlsx) formatida yuklab olish' })
  async exportExcel(
    @Param('reportType') reportType: string,
    @CurrentUser() actor: RequestUser,
    @Res() res: FastifyReply,
    @Query('branchId') branchId?: string,
  ): Promise<void> {
    if (!REPORT_TYPES.includes(reportType as ReportType)) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
    }
    const { buffer, filename, mimeType } = await this.service.exportReport(
      reportType as ReportType,
      'excel',
      actor,
      branchId,
    );
    res.header('Content-Type', mimeType);
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get(':reportType/export/pdf')
  @RequirePermission('stats.operational')
  @NoAudit('Hisobotni PDF eksport qilish')
  @ApiOperation({ summary: 'FR-DASH-4: Hisobotni PDF (.pdf) formatida yuklab olish' })
  async exportPdf(
    @Param('reportType') reportType: string,
    @CurrentUser() actor: RequestUser,
    @Res() res: FastifyReply,
    @Query('branchId') branchId?: string,
  ): Promise<void> {
    if (!REPORT_TYPES.includes(reportType as ReportType)) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
    }
    const { buffer, filename, mimeType } = await this.service.exportReport(
      reportType as ReportType,
      'pdf',
      actor,
      branchId,
    );
    res.header('Content-Type', mimeType);
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('parent-digest/preview')
  @RequirePermission('results.view')
  @NoAudit('Ota-ona xulosasi preview')
  @ApiOperation({ summary: 'FR-RPT-2, 3: Ota-ona hisoboti oldindan koʻrish (preview)' })
  async getParentDigestPreview(@Query() query: ParentDigestQuery): Promise<ParentDigestReport> {
    return this.parentDigest.getDigestReport(query.studentId, query.period ?? 'weekly');
  }

  @Get('parent-digest/:studentId/pdf')
  @RequirePermission('results.view')
  @NoAudit('Ota-ona xulosasi PDF')
  @ApiOperation({ summary: 'FR-RPT-3: Oylik ota-ona hisoboti PDF formatida' })
  async getParentDigestPdf(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Res() res: FastifyReply,
    @Query('period') period: 'weekly' | 'monthly' = 'monthly',
  ): Promise<void> {
    const report = await this.parentDigest.getDigestReport(studentId, period);
    const pdfBuffer = await this.parentDigest.generateDigestPdf(report);
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="parent-report-${studentId}.pdf"`);
    res.send(Buffer.from(pdfBuffer));
  }

  @Post('parent-digest/dispatch')
  @RequirePermission('settings.manage')
  @Audit({ action: 'reports.parent_digest_dispatch', entity: 'report' })
  @ApiOperation({ summary: 'FR-RPT-2, 3: Ota-ona xulosalarini navbatga chiqarish (dispatch)' })
  async dispatchParentDigest(
    @Query('period') period: 'weekly' | 'monthly' = 'weekly',
  ): Promise<{ dispatchedCount: number }> {
    const dispatchedCount =
      period === 'monthly'
        ? await this.parentDigest.dispatchMonthlyDigest()
        : await this.parentDigest.dispatchWeeklyDigest();
    return { dispatchedCount };
  }
}
