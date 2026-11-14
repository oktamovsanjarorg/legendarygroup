import { DEFAULT_BRANCH_ID, type DirectorDashboardKpi } from '@lg/contracts';
import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { DashboardService } from './dashboard.service.js';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly service: DashboardService) {}

  @Get('director')
  @RequirePermission('stats.operational')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-DASH-1/5 Director bosh sahifasi KPI koʻrsatkichlari' })
  async getDirectorKpi(
    @CurrentUser() actor: RequestUser,
    @Query('refresh') refresh?: string,
  ): Promise<DirectorDashboardKpi> {
    const forced = refresh === 'true' || refresh === '1';
    return this.service.getDirectorDashboardKpi(actor, DEFAULT_BRANCH_ID, forced);
  }
}
