import { DEFAULT_BRANCH_ID } from '@lg/contracts';
import { formatMoney } from '@lg/i18n';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { DashboardService } from './dashboard.service.js';

@Injectable()
export class DashboardCron implements OnModuleInit {
  private readonly logger = new Logger(DashboardCron.name);

  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(DashboardService) private readonly dashboardService: DashboardService,
  ) {}

  onModuleInit(): void {
    this.cron.register({
      id: 'dashboard.daily-summary',
      pattern: '0 21 * * *', // Har kuni 21:00 (Toshkent vaqtida, T-405 AC)
      run: async () => {
        await this.sendDailySummary();
      },
    });
  }

  async sendDailySummary(): Promise<void> {
    this.logger.log('Kunlik 21:00 Director xulosasi hisoblanmoqda...');
    const kpi = await this.dashboardService.getDirectorDashboardKpi(
      { id: 'system', role: 'director', pv: 1, sessionId: null },
      DEFAULT_BRANCH_ID,
      true,
    );

    const summaryText = [
      '📊 Kunlik xulosa (21:00):',
      `• Bugungi tushum: ${formatMoney(BigInt(kpi.revenueToday))}`,
      `• Oylik jami tushum: ${formatMoney(BigInt(kpi.revenueMonth))}`,
      `• Davomat koʻrsatkichi: ${kpi.attendance}%`,
      `• Belgilanmagan darslar: ${kpi.unmarked} ta`,
      `• Yangi oʻquvchilar (shu oy): +${kpi.joined}`,
      `• Faol oʻquvchilar: ${kpi.activeStudents} nafar`,
      `• Kutilayotgan tasdiqlar: ${kpi.approvals} ta`,
    ].join('\n');

    this.logger.log(`Kunlik xulosa tayyorlandi:\n${summaryText}`);
  }
}
