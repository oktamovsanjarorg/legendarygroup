import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { ForecastsService } from './forecasts.service.js';

@Injectable()
export class ForecastsCron implements OnModuleInit {
  private readonly logger = new Logger(ForecastsCron.name);

  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(ForecastsService) private readonly service: ForecastsService,
  ) {}

  onModuleInit(): void {
    this.cron.register({
      id: 'forecasts.weekly-summary',
      pattern: '0 9 * * 1', // Har dushanba 09:00 da Director haftalik prognoz va xavfli o'quvchilar xulosasi (AC: T-502)
      run: async () => {
        await this.generateWeeklySummary();
      },
    });
  }

  async generateWeeklySummary(): Promise<void> {
    this.logger.log('Haftalik dushanba 09:00 prognoz va churn xulosasi tayyorlanmoqda...');
    const churn = await this.service.getChurnRiskReport({
      id: 'system',
      role: 'director',
      pv: 1,
      sessionId: null,
    });
    this.logger.log(
      `Haftalik xulosa: jami ${churn.totalStudents} oʻquvchidan ${churn.atRiskCount} nafari xavf ostida (ball >= 60).`,
    );
  }
}
