import {
  type AuditLogItem,
  ListAuditLogsQuery,
  ListSuspiciousQuery,
  type StaffActivityItem,
  StaffActivityQuery,
  type SuspiciousActivityItem,
} from '@lg/contracts';
import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
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
    @ZodQuery(ListAuditLogsQuery) query: ListAuditLogsQuery,
  ): Promise<AuditLogItem[]> {
    return this.service.listAuditLogs(actor, query);
  }

  @Get('suspicious')
  @RequirePermission('audit.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-AUD-2 Shubhali harakatlar roʻyxati' })
  async listSuspicious(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(ListSuspiciousQuery) query: ListSuspiciousQuery,
  ): Promise<SuspiciousActivityItem[]> {
    return this.service.listSuspiciousActivities(actor, query.limit);
  }

  @Get('staff-activity')
  @RequirePermission('audit.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-AUD-3 Xodimlar faolligi hisoboti' })
  async getStaffActivity(
    @CurrentUser() actor: RequestUser,
    @ZodQuery(StaffActivityQuery) query: StaffActivityQuery,
  ): Promise<StaffActivityItem[]> {
    return this.service.getStaffActivity(actor, query.period);
  }
}
