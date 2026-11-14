import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { type Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { TelegramOutbox } from '../telegram/index.js';
import { ForecastsRepository } from './forecasts.repository.js';
import { ForecastsService } from './forecasts.service.js';

@Injectable()
export class ForecastsCron implements OnModuleInit {
  private readonly logger = new Logger(ForecastsCron.name);

  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(ForecastsService) private readonly service: ForecastsService,
    @Inject(ForecastsRepository) private readonly repo: ForecastsRepository,
    @Inject(TelegramOutbox) private readonly telegramOutbox: TelegramOutbox,
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

    const summaryText =
      `📊 *Haftalik prognoz va xavf xulosasi*\n\n` +
      `Jami oʻquvchilar: ${churn.totalStudents}\n` +
      `Ketish xavfi ostida: ${churn.atRiskCount} nafar (ball ≥ 60)\n\n` +
      `Batafsil maʼlumotni CRM panelida koʻrishingiz mumkin.`;

    this.logger.log(
      `Haftalik xulosa: jami ${churn.totalStudents} oʻquvchidan ${churn.atRiskCount} nafari xavf ostida (ball >= 60).`,
    );

    const chatIds = await this.repo.getDirectorTelegramChatIds();
    const today = this.clock.today();

    for (const chatId of chatIds) {
      await this.telegramOutbox.enqueue(
        {
          method: 'sendMessage',
          chatId,
          payload: { text: summaryText, parse_mode: 'Markdown' },
        },
        { dedupeKey: `forecasts:weekly-summary:${today}:${chatId}` },
      );
    }
  }
}
