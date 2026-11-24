import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type { Clock } from '@lg/domain';
import { miniappMessages } from '@lg/i18n';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { NotificationsService } from '../notifications/index.js';
import { ForecastsService } from './forecasts.service.js';

const t = miniappMessages.staffForecasts;
/** Telegram xabarida to'liq ro'yxat emas — qolgani Mini App'da (MS-30). */
const NAMES_SHOWN = 15;

@Injectable()
export class ForecastsCron implements OnModuleInit {
  private readonly logger = new Logger(ForecastsCron.name);

  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(ForecastsService) private readonly service: ForecastsService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
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
    if (churn.atRiskCount === 0) return;
    const risky = churn.items.filter((i) => i.isAtRisk);
    const names = risky.slice(0, NAMES_SHOWN).map((i) => `• ${i.studentName} — ${i.churnScore}`);
    const rest = risky.length - names.length;
    await this.notifications.notifyStaff({
      title: t.weeklyTitle.replace('{n}', String(churn.atRiskCount)),
      body: [
        ...names,
        ...(rest > 0 ? [t.weeklyRest.replace('{n}', String(rest))] : []),
        t.weeklyWhere,
      ].join('\n'),
      // Cron qayta ishlasa ham haftada bitta xabar.
      dedupeKey: `weekly-risk-${this.clock.today()}`,
    });
  }
}
