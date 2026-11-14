import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller.js';
import { DashboardCron } from './dashboard.cron.js';
import { DashboardRepository } from './dashboard.repository.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService, DashboardCron],
  exports: [DashboardService, DashboardRepository, DashboardCron],
})
export class DashboardModule {}
