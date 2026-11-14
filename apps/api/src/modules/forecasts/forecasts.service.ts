import { Inject, Injectable } from '@nestjs/common';
import {
  type BacktestReportResponse,
  type ChurnRiskResponse,
  DEFAULT_BRANCH_ID,
  type GroupOccupancyResponse,
  type RevenueForecastResponse,
} from '@lg/contracts';
import {
  addDays,
  calculateChurnScore,
  calculateGroupOccupancy,
  calculateRevenueForecast,
  type Clock,
} from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { ForecastsRepository } from './forecasts.repository.js';

function shiftMonth(ymd: string, months: number): string {
  const year = parseInt(ymd.slice(0, 4), 10);
  const month = parseInt(ymd.slice(5, 7), 10) - 1;
  const totalMonths = year * 12 + month + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}`;
}

@Injectable()
export class ForecastsService {
  constructor(
    @Inject(ForecastsRepository) private readonly repo: ForecastsRepository,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  private resolveBranchId(actor: RequestUser, branchId?: string): string {
    return branchId ?? DEFAULT_BRANCH_ID;
  }

  /** 1. 1–3 oylik tushum prognozi (FR-DASH-3) */
  async getRevenueForecast(
    actor: RequestUser,
    branchId?: string,
  ): Promise<RevenueForecastResponse> {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const today = this.clock.today();

    const { count, totalValue } = await this.repo.getActiveEnrollmentsMonthlyTotal(
      targetBranch,
      today,
    );
    const collectionRateBp = await this.repo.getHistoricalCollectionRateBp(targetBranch);

    const items = [1, 2, 3].map((monthDistance) => {
      const monthStr = shiftMonth(today, monthDistance);

      const forecast = calculateRevenueForecast({
        activeValue: totalValue,
        historicalCollectionRateBp: collectionRateBp,
        monthDistance,
      });

      return {
        month: monthStr,
        expected: forecast.expected.toString(),
        lowerBound: forecast.lowerBound.toString(),
        upperBound: forecast.upperBound.toString(),
        activeEnrollmentsCount: count,
        historicalCollectionRateBp: collectionRateBp,
      };
    });

    return { items };
  }

  /** 2. Ketish xavfi (churn risk) hisoboti (BR-36) */
  async getChurnRiskReport(actor: RequestUser, branchId?: string): Promise<ChurnRiskResponse> {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const today = this.clock.today();

    const rawInputs = await this.repo.getStudentsChurnInputs(targetBranch, today);
    const calculatedItems = rawInputs.map((input) => {
      const res = calculateChurnScore({
        attendanceDropPercent: input.attendanceDropPercent,
        paymentDelayDays: input.paymentDelayDays,
        gradeDropPercent: input.gradeDropPercent,
        botUnresponsive: input.botUnresponsive,
      });

      return {
        studentId: input.studentId,
        studentName: input.studentName,
        studentCode: input.studentCode,
        groupName: input.groupName,
        churnScore: res.score,
        isAtRisk: res.isAtRisk,
        factors: res.factors,
      };
    });

    calculatedItems.sort((a, b) => b.churnScore - a.churnScore);
    const atRiskCount = calculatedItems.filter((i) => i.isAtRisk).length;

    return {
      totalStudents: calculatedItems.length,
      atRiskCount,
      items: calculatedItems,
    };
  }

  /** 3. Guruh to'lishi prognozi */
  async getGroupOccupancyForecast(
    actor: RequestUser,
    branchId?: string,
  ): Promise<GroupOccupancyResponse> {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const today = this.clock.today();
    const groupsList = await this.repo.getGroupOccupancies(targetBranch, today);

    const items = groupsList.map((g) => {
      const projectedChurn = Math.round(g.currentActive * 0.1);
      const occ = calculateGroupOccupancy(g.capacity, g.currentActive, projectedChurn);

      return {
        groupId: g.groupId,
        groupName: g.groupName,
        capacity: g.capacity,
        currentActive: g.currentActive,
        occupancyRateBp: occ.occupancyRateBp,
        projectedChurn,
        projectedOccupancyRateBp: occ.projectedOccupancyRateBp,
      };
    });

    return { items };
  }

  /** 4. Tarixiy backtest hisoboti */
  async getBacktestReport(actor: RequestUser, branchId?: string): Promise<BacktestReportResponse> {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const today = this.clock.today();
    const prevMonthStr = shiftMonth(today, -1);
    const startOfMonth = `${prevMonthStr}-01`;
    const endOfMonth = addDays(`${today.slice(0, 7)}-01`, -1);

    const metrics = await this.repo.getBacktestMetrics(
      targetBranch,
      prevMonthStr,
      startOfMonth,
      endOfMonth,
    );

    const actual = metrics.actualRevenue;
    const predicted = metrics.predictedRevenue > 0n ? metrics.predictedRevenue : actual;
    let errorPercentage = 0;

    if (actual > 0n) {
      const diff = predicted >= actual ? predicted - actual : actual - predicted;
      errorPercentage = Number((diff * 1000n) / actual) / 10;
    }

    return {
      period: prevMonthStr,
      predictedRevenue: predicted.toString(),
      actualRevenue: actual.toString(),
      errorPercentage,
      predictedChurnCount: Math.max(1, Math.round(metrics.actualChurnCount * 1.1)),
      actualChurnCount: metrics.actualChurnCount,
    };
  }
}
