import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/index.js';
import { SettingsModule } from '../settings/index.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardCron } from './dashboard.cron.js';
import { DashboardRepository } from './dashboard.repository.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [NotificationsModule, SettingsModule],
  controllers: [DashboardController],
  providers: [DashboardRepository, DashboardService, DashboardCron],
  exports: [DashboardService, DashboardRepository, DashboardCron],
})
export class DashboardModule {}
