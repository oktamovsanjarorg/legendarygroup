import type { DirectorDashboardKpi } from '@lg/contracts';
import {
  addDays,
  calculateAttendancePercent,
  calculatePercentageChange,
  type Clock,
} from '@lg/domain';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { DashboardRepository } from './dashboard.repository.js';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);
  private readonly CACHE_TTL_SECONDS = 300; // 5 daqiqa

  constructor(
    @Inject(DashboardRepository) private readonly repo: DashboardRepository,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async getDirectorDashboardKpi(
    _actor: RequestUser,
    branchId: string,
    forcedRefresh = false,
  ): Promise<DirectorDashboardKpi> {
    if (_actor.role !== 'director' && _actor.role !== 'admin') {
      throw new ForbiddenException({ code: 'FORBIDDEN' });
    }
    const cacheKey = `dashboard:director:${branchId}`;

    if (!forcedRefresh) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) {
          return JSON.parse(cached) as DirectorDashboardKpi;
        }
      } catch (err) {
        this.logger.warn(`Redis cache get failed: ${err}`);
      }
    }

    const kpi = await this.computeDashboardKpi(branchId);

    try {
      await this.redis.set(cacheKey, JSON.stringify(kpi), 'EX', this.CACHE_TTL_SECONDS);
    } catch (err) {
      this.logger.warn(`Redis cache set failed: ${err}`);
    }

    return kpi;
  }

  private async computeDashboardKpi(branchId: string): Promise<DirectorDashboardKpi> {
    // Toshkent kuni (UTC emas: 00:00–05:00 oralig'ida UTC sanasi kechagi kun bo'ladi).
    const todayYmd = this.clock.today();
    const year = Number(todayYmd.slice(0, 4));
    const month = Number(todayYmd.slice(5, 7));

    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    const yesterdayYmd = addDays(todayYmd, -1);

    const [
      revenueMonth,
      revenuePrevMonth,
      dailyRevenues,
      revenueToday,
      revenueYesterday,
      debtTotal,
      activeStudents,
      attStats,
      flow,
      counts,
      todayLessons,
    ] = await Promise.all([
      this.repo.getMonthlyRevenue(branchId, year, month),
      this.repo.getMonthlyRevenue(branchId, prevYear, prevMonth),
      this.repo.getDailyRevenues(branchId, year, month),
      this.repo.getDayRevenue(branchId, todayYmd),
      this.repo.getDayRevenue(branchId, yesterdayYmd),
      this.repo.getTotalDebt(branchId),
      this.repo.getActiveStudentsCount(branchId, todayYmd),
      this.repo.getTodayAttendanceStats(todayYmd),
      this.repo.getStudentFlow(branchId, year, month),
      this.repo.getPendingCounts(branchId),
      this.repo.getTodayLessons(branchId, todayYmd),
    ]);

    const revenueDelta = calculatePercentageChange(revenueMonth, revenuePrevMonth);
    const attendancePercent = calculateAttendancePercent(attStats.attended, attStats.total);

    return {
      revenueMonth: revenueMonth.toString(),
      revenueDelta,
      revenueToday: revenueToday.toString(),
      revenueYesterday: revenueYesterday.toString(),
      debtTotal: debtTotal.toString(),
      activeStudents,
      attendance: attendancePercent,
      queue: counts.queue,
      unmarked: attStats.unmarked,
      joined: flow.joined,
      left: flow.left,
      approvals: counts.approvals,
      daily: dailyRevenues.map((d) => ({ day: d.day, amount: d.amount.toString() })),
      todayLessons,
      cachedAt: this.clock.now().toISOString(),
    };
  }
}
