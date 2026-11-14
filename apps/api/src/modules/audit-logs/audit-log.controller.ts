import type {
  AuditLogItem,
  ListAuditLogsQuery,
  StaffActivityItem,
  StaffActivityQuery,
  SuspiciousActivityItem,
} from '@lg/contracts';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { AuditLogService } from './audit-log.service.js';

@ApiTags('Audit & Compliance')
@ApiBearerAuth()
@Controller('audit')
export class AuditLogController {
  constructor(@Inject(AuditLogService) private readonly service: AuditLogService) {}

  @Get('logs')
  @RequirePermission('audit.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-AUD-1/2 Audit jurnali roʻyxati va filtrlar' })
  async listLogs(
    @CurrentUser() actor: RequestUser,
    @Query() query: ListAuditLogsQuery,
  ): Promise<AuditLogItem[]> {
    return this.service.listAuditLogs(actor, query);
  }

  @Get('suspicious')
  @RequirePermission('audit.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-AUD-2 Shubhali harakatlar roʻyxati' })
  async listSuspicious(
    @CurrentUser() actor: RequestUser,
    @Query('limit') limit?: number,
  ): Promise<SuspiciousActivityItem[]> {
    return this.service.listSuspiciousActivities(actor, limit ? Number(limit) : 50);
  }

  @Get('staff-activity')
  @RequirePermission('audit.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-AUD-3 Xodimlar faolligi hisoboti' })
  async getStaffActivity(
    @CurrentUser() actor: RequestUser,
    @Query() query: StaffActivityQuery,
  ): Promise<StaffActivityItem[]> {
    return this.service.getStaffActivity(actor, query.period);
  }
}
