import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type BacktestReportResponse,
  type ChurnRiskResponse,
  type GroupOccupancyResponse,
  type RevenueForecastResponse,
} from '@lg/contracts';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { ForecastsService } from './forecasts.service.js';

@ApiTags('Forecasts')
@ApiBearerAuth()
@Controller('forecasts')
export class ForecastsController {
  constructor(@Inject(ForecastsService) private readonly service: ForecastsService) {}

  @Get('revenue')
  @RequirePermission('finance.view')
  @NoAudit('Tushum prognozi')
  @ApiOperation({ summary: 'FR-DASH-3: 1–3 oylik tushum prognozi (ishonch oraligʻi bilan)' })
  async getRevenueForecast(
    @CurrentUser() actor: RequestUser,
    @Query('branchId') branchId?: string,
  ): Promise<RevenueForecastResponse> {
    return this.service.getRevenueForecast(actor, branchId);
  }

  @Get('churn')
  @RequirePermission('stats.operational')
  @NoAudit('Ketish xavfi (churn)')
  @ApiOperation({
    summary: 'FR-DASH-3, BR-36: Ketish xavfi (0-100 ball) va xavfli oʻquvchilar roʻyxati',
  })
  async getChurnRisk(
    @CurrentUser() actor: RequestUser,
    @Query('branchId') branchId?: string,
  ): Promise<ChurnRiskResponse> {
    return this.service.getChurnRiskReport(actor, branchId);
  }

  @Get('occupancy')
  @RequirePermission('stats.operational')
  @NoAudit('Guruh toʻlishi prognozi')
  @ApiOperation({ summary: 'FR-DASH-3: Guruh toʻlishi va prognoz churn tahlili' })
  async getGroupOccupancy(
    @CurrentUser() actor: RequestUser,
    @Query('branchId') branchId?: string,
  ): Promise<GroupOccupancyResponse> {
    return this.service.getGroupOccupancyForecast(actor, branchId);
  }

  @Get('backtest')
  @RequirePermission('finance.view')
  @NoAudit('Backtest hisoboti')
  @ApiOperation({ summary: 'FR-DASH-3: Tarixiy maʼlumotda model aniqligi / backtest hisoboti' })
  async getBacktest(
    @CurrentUser() actor: RequestUser,
    @Query('branchId') branchId?: string,
  ): Promise<BacktestReportResponse> {
    return this.service.getBacktestReport(actor, branchId);
  }
}
