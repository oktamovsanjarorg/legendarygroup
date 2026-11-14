import { Module } from '@nestjs/common';
import { ClockModule } from '../../common/clock/clock.module.js';
import { GradesModule } from '../grades/index.js';
import { NotificationsModule } from '../notifications/index.js';
import { ParentDigestRepository } from './parent-digest.repository.js';
import { ParentDigestService } from './parent-digest.service.js';
import { ReportsController } from './reports.controller.js';
import { ReportsCron } from './reports.cron.js';
import { ReportsExporterService } from './reports-exporter.service.js';
import { ReportsPerformanceRepository } from './reports-performance.repository.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  imports: [ClockModule, GradesModule, NotificationsModule],
  controllers: [ReportsController],
  providers: [
    ReportsPerformanceRepository,
    ReportsRepository,
    ReportsExporterService,
    ReportsService,
    ReportsCron,
    ParentDigestRepository,
    ParentDigestService,
  ],
  exports: [ReportsService, ReportsRepository, ParentDigestService, ParentDigestRepository],
})
export class ReportsModule {}
