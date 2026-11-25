import { Module } from '@nestjs/common';
import { ClockModule } from '../../common/clock/clock.module.js';
import { FilesModule } from '../files/index.js';
import { GradesModule } from '../grades/index.js';
import { NotificationsModule } from '../notifications/index.js';
import { SettingsModule } from '../settings/index.js';
import { StudentsModule } from '../students/index.js';
import { ParentDigestRepository } from './parent-digest.repository.js';
import { ParentDigestService } from './parent-digest.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsCron } from './reports.cron.js';
import { ReportsExporterService } from './reports-exporter.service.js';
import { ReportsPerformanceRepository } from './reports-performance.repository.js';
import { ReportsDeliveryService } from './reports-delivery.service.js';
import { ReportsRevenueRepository } from './reports-revenue.repository.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [
    ClockModule,
    FilesModule,
    GradesModule,
    NotificationsModule,
    SettingsModule,
    StudentsModule,
  ],
  controllers: [ReportsController],
  providers: [
    ReportsPerformanceRepository,
    ReportsRevenueRepository,
    ReportsRepository,
    ReportsDeliveryService,
    ReportsExporterService,
    ReportsService,
    ReportsCron,
    ParentDigestRepository,
    ParentDigestService,
  ],
  exports: [ReportsService, ReportsRepository, ParentDigestService, ParentDigestRepository],
})
export class ReportsModule {}
