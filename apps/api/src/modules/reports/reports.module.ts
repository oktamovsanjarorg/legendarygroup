import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller.js';
import { ReportsCron } from './reports.cron.js';
import { ReportsExporterService } from './reports-exporter.service.js';
import { ReportsPerformanceRepository } from './reports-performance.repository.js';
import { ReportsRepository } from './reports.repository.js';
import { ReportsService } from './reports.service.js';

@Module({
  controllers: [ReportsController],
  providers: [
    ReportsPerformanceRepository,
    ReportsRepository,
    ReportsExporterService,
    ReportsService,
    ReportsCron,
  ],
  exports: [ReportsService, ReportsRepository],
})
export class ReportsModule {}
