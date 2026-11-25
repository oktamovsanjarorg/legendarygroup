import { DEFAULT_BRANCH_ID } from '@lg/contracts';
import type { Clock } from '@lg/domain';
import { formatMoney, miniappMessages } from '@lg/i18n';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { CronJobs } from '../../common/scheduler/cron-jobs.js';
import { isSlot, SLOT_PATTERN } from '../../common/scheduler/time-slot.js';
import { NotificationsService } from '../notifications/index.js';
import { SettingsService } from '../settings/index.js';
import { DashboardService } from './dashboard.service.js';

const t = miniappMessages.dailySummary;

/** T-405: Direktorga kunlik xulosa — sozlangan vaqtda (Q-107), bot orqali. */
@Injectable()
export class DashboardCron implements OnModuleInit {
  constructor(
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(DashboardService) private readonly dashboardService: DashboardService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  onModuleInit(): void {
    this.cron.register({
      id: 'dashboard.daily-summary',
      pattern: SLOT_PATTERN,
      run: async () => {
        const { notificationTimes } = await this.settings.getSettings();
        if (isSlot(this.clock, notificationTimes.eveningDigestTime)) await this.sendDailySummary();
      },
    });
  }

  async sendDailySummary(): Promise<void> {
    const kpi = await this.dashboardService.getDirectorDashboardKpi(
      { id: 'system', role: 'director', pv: 1, sessionId: null },
      DEFAULT_BRANCH_ID,
      true,
    );
    const rows: [string, string | number][] = [
      [t.revenueToday, formatMoney(BigInt(kpi.revenueToday))],
      [t.revenueMonth, formatMoney(BigInt(kpi.revenueMonth))],
      [t.attendance, `${kpi.attendance}%`],
      [t.unmarked, kpi.unmarked],
      [t.joined, kpi.joined],
      [t.activeStudents, kpi.activeStudents],
      [t.approvals, kpi.approvals],
    ];
    await this.notifications.notifyStaff({
      title: t.title,
      body: rows.map(([label, value]) => `• ${label}: ${value}`).join('\n'),
      // Tushum bor — faqat Direktorga; cron qayta ishlasa ham kuniga bitta.
      roles: ['director'],
      dedupeKey: `daily-summary-${this.clock.today()}`,
    });
  }
}
