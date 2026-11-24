import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  type AttendanceReportQuery,
  AttendanceReportQuerySchema,
  type AttendanceReportResponse,
  type CohortReportQuery,
  CohortReportQuerySchema,
  type CohortReportResponse,
  type DebtAgingQuery,
  DebtAgingQuerySchema,
  type DebtAgingResponse,
  type LeadsConversionReportQuery,
  LeadsConversionReportQuerySchema,
  type LeadsConversionReportResponse,
  type ParentDigestQuery,
  ParentDigestQuerySchema,
  type ParentDigestReport,
  REPORT_TYPES,
  type ReportType,
  type RevenueReportQuery,
  RevenueReportQuerySchema,
  type RevenueReportResponse,
  SendReportRequest,
  type SendReportResult,
  type TeacherPerformanceReportQuery,
  TeacherPerformanceReportQuerySchema,
  type TeacherPerformanceReportResponse,
} from '@lg/contracts';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { CenterWide, RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { AppException } from '../../common/errors/app.exception.js';
import { StudentScopeService } from '../students/index.js';
import { ParentDigestService } from './parent-digest.service.js';
import { ReportsDeliveryService } from './reports-delivery.service.js';
import { ReportsService } from './reports.service.js';

function asReportType(value: string): ReportType {
  const type = REPORT_TYPES.find((x) => x === value);
  if (!type) throw new AppException(HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
  return type;
}

@ApiTags('Reports')
@Controller('reports')
export class ReportsController {
  constructor(
    @Inject(ReportsService) private readonly service: ReportsService,
    @Inject(ReportsDeliveryService) private readonly delivery: ReportsDeliveryService,
    @Inject(ParentDigestService) private readonly parentDigest: ParentDigestService,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
  ) {}

  @Get('revenue')
  @RequirePermission('finance.view')
  @NoAudit('Daromad hisoboti')
  @ApiOperation({ summary: "FR-DASH-2: Daromad hisoboti (oy, kurs, guruh, ustoz bo'yicha)" })
  async getRevenueReport(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(RevenueReportQuerySchema) query: RevenueReportQuery,
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
    @ZodQuery(DebtAgingQuerySchema) query: DebtAgingQuery,
  ): Promise<DebtAgingResponse> {
    return this.service.getDebtAgingReport(actor, query.branchId);
  }

  @Get('attendance')
  @CenterWide()
  @RequirePermission('stats.operational')
  @NoAudit('Davomat hisoboti')
  @ApiOperation({ summary: "FR-DASH-2: Davomat hisoboti (guruh/ustoz bo'yicha)" })
  async getAttendanceReport(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(AttendanceReportQuerySchema) query: AttendanceReportQuery,
  ): Promise<AttendanceReportResponse> {
    return this.service.getAttendanceReport(actor, {
      groupBy: query.groupBy ?? 'group',
      from: query.from,
      to: query.to,
      branchId: query.branchId,
    });
  }

  @Get('cohort')
  @CenterWide()
  @RequirePermission('stats.operational')
  @NoAudit('Kohorta hisoboti')
  @ApiOperation({ summary: 'FR-DASH-2: Kohorta tahlili (oʻquvchi saqlanishi)' })
  async getCohortReport(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(CohortReportQuerySchema) query: CohortReportQuery,
  ): Promise<CohortReportResponse> {
    return this.service.getCohortReport(actor, query.monthsCount ?? 6, query.branchId);
  }

  @Get('leads')
  @CenterWide()
  @RequirePermission('stats.operational')
  @NoAudit('Lid konversiyasi hisoboti')
  @ApiOperation({ summary: 'FR-DASH-2: Lid konversiyasi hisoboti' })
  async getLeadsConversionReport(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(LeadsConversionReportQuerySchema) query: LeadsConversionReportQuery,
  ): Promise<LeadsConversionReportResponse> {
    return this.service.getLeadsConversionReport(actor, query);
  }

  @Get('teacher-performance')
  @CenterWide()
  @RequirePermission('stats.operational')
  @NoAudit('Ustoz samaradorligi hisoboti')
  @ApiOperation({ summary: 'FR-DASH-2: Ustoz samaradorligi hisoboti' })
  async getTeacherPerformanceReport(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(TeacherPerformanceReportQuerySchema) query: TeacherPerformanceReportQuery,
  ): Promise<TeacherPerformanceReportResponse> {
    return this.service.getTeacherPerformanceReport(actor, query);
  }

  @Get(':reportType/export/:format')
  @CenterWide()
  @RequirePermission('stats.operational')
  @NoAudit('Hisobotni eksport qilish')
  @ApiOperation({ summary: 'FR-DASH-4: Hisobotni Excel yoki PDF formatida yuklab olish' })
  async exportFile(
    @Param('reportType') reportType: string,
    @Param('format') format: string,
    @CurrentUser() actor: RequestUser,
    @Res() res: FastifyReply,
  ): Promise<void> {
    if (format !== 'excel' && format !== 'pdf')
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    const file = await this.service.exportReport(asReportType(reportType), format, actor);
    res.header('Content-Type', file.mimeType);
    res.header('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.send(file.buffer);
  }

  @Post(':reportType/send')
  @HttpCode(HttpStatus.ACCEPTED)
  @CenterWide()
  @RequirePermission('stats.operational')
  @Audit({ action: 'report.send', entity: 'report' })
  @ApiOperation({ summary: 'T-158: Hisobot faylini soʻragan xodimning bot chatiga yuborish' })
  async send(
    @Param('reportType') reportType: string,
    @CurrentUser() actor: RequestUser,
    @ZodBody(SendReportRequest) body: SendReportRequest,
    @Req() req: FastifyRequest,
  ): Promise<SendReportResult> {
    return this.delivery.send(actor, asReportType(reportType), body, auditContext(req));
  }

  @Get('parent-digest/preview')
  @RequirePermission('results.view')
  @NoAudit('Ota-ona xulosasi preview')
  @ApiOperation({ summary: 'FR-RPT-2, 3: Ota-ona hisoboti oldindan koʻrish (preview)' })
  async getParentDigestPreview(
    @ZodQuery(ParentDigestQuerySchema) query: ParentDigestQuery,
    @CurrentUser() user: RequestUser,
  ): Promise<ParentDigestReport> {
    // Scope: ota-ona — o'z farzandi, ustoz — o'z guruhidagi; begona — 404 (T-505 IDOR).
    await this.studentScope.assertVisible(user, query.studentId);
    return this.parentDigest.getDigestReport(query.studentId, query.period ?? 'weekly');
  }

  @Get('parent-digest/:studentId/pdf')
  @RequirePermission('results.view')
  @NoAudit('Ota-ona xulosasi PDF')
  @ApiOperation({ summary: 'FR-RPT-3: Oylik ota-ona hisoboti PDF formatida' })
  async getParentDigestPdf(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Res() res: FastifyReply,
    @CurrentUser() user: RequestUser,
    @Query('period') period: 'weekly' | 'monthly' = 'monthly',
  ): Promise<void> {
    await this.studentScope.assertVisible(user, studentId);
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
