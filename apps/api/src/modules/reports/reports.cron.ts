import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { ParentDigestService } from './parent-digest.service.js';
import { ReportsService } from './reports.service.js';

@Injectable()
export class ReportsCron implements OnModuleInit {
  private readonly logger = new Logger(ReportsCron.name);

  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(ReportsService) private readonly service: ReportsService,
    @Inject(ParentDigestService) private readonly parentDigest: ParentDigestService,
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

    this.cron.register({
      id: 'reports.parent-digest-weekly',
      pattern: '0 19 * * 0', // FR-RPT-2: Har yakshanba 19:00 da ota-onaga haftalik hisobot
      run: async () => {
        this.logger.log('Ota-onalarga haftalik hisobot yuborilmoqda...');
        const count = await this.parentDigest.dispatchWeeklyDigest();
        this.logger.log(`Haftalik hisobot: ${count} ta ota-onaga yuborildi.`);
      },
    });

    this.cron.register({
      id: 'reports.parent-digest-monthly',
      pattern: '0 20 28-31 * *', // FR-RPT-3: Oy oxiri 20:00 da oylik batafsil hisobot
      run: async () => {
        this.logger.log('Ota-onalarga oylik hisobot yuborilmoqda...');
        const count = await this.parentDigest.dispatchMonthlyDigest();
        this.logger.log(`Oylik hisobot: ${count} ta ota-onaga yuborildi.`);
      },
    });
  }
}
