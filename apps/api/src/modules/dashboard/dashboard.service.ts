import type { DirectorDashboardKpi } from '@lg/contracts';
import { calculateAttendancePercent, calculatePercentageChange } from '@lg/domain';
import { ForbiddenException, Inject, Injectable, Logger } from '@nestjs/common';
import type { Redis } from 'ioredis';
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
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth() + 1;

    const prevYear = month === 1 ? year - 1 : year;
    const prevMonth = month === 1 ? 12 : month - 1;

    const todayYmd = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayYmd = yesterday.toISOString().slice(0, 10);

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
      this.repo.getActiveStudentsCount(branchId),
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
      cachedAt: new Date().toISOString(),
    };
  }
}
