import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { ReportsService } from './reports.service.js';

@Injectable()
export class ReportsCron implements OnModuleInit {
  private readonly logger = new Logger(ReportsCron.name);

  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(ReportsService) private readonly service: ReportsService,
  ) {}

  onModuleInit(): void {
    this.cron.register({
      id: 'reports.refresh-views',
      pattern: '0 3 * * *', // Har tun 03:00 da og'ir tahliliy materialized view'lar yangilanadi (AC: T-501)
      run: async () => {
        this.logger.log("Tungi materialized view'lar yangilanmoqda...");
        try {
          await this.service.refreshMaterializedViews();
          this.logger.log("Materialized view'lar muvaffaqiyatli yangilandi.");
        } catch (err) {
          this.logger.error("Materialized view'larni yangilashda xatolik:", err);
        }
      },
    });
  }
}
