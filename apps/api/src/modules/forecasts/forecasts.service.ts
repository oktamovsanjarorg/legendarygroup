import { Inject, Injectable } from '@nestjs/common';
import {
  type BacktestReportResponse,
  type ChurnRiskResponse,
  DEFAULT_BRANCH_ID,
  type GroupOccupancyResponse,
  type RevenueForecastResponse,
} from '@lg/contracts';
import {
  calculateChurnScore,
  calculateGroupOccupancy,
  calculateRevenueForecast,
  type Clock,
} from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { ForecastsRepository, type RawStudentChurnData } from './forecasts.repository.js';
import { addMonths } from './forecasts-history.js';
import { prevMonthRange } from './prev-month.js';

const churnScore = (i: RawStudentChurnData) =>
  calculateChurnScore({
    attendanceDropPercent: i.attendanceDropPercent,
    paymentDelayDays: i.paymentDelayDays,
    gradeDropPercent: i.gradeDropPercent,
    botUnresponsive: i.botUnresponsive,
  });

/** |prognoz − haqiqiy| / haqiqiy, 0.1% aniqlik (pul emas — nisbat); haqiqiy 0 bo'lsa 0. */
export const errorPercent = (predicted: bigint, actual: bigint): number => {
  if (actual <= 0n) return 0;
  const diff = predicted > actual ? predicted - actual : actual - predicted;
  return Number((diff * 1000n) / actual) / 10;
};

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

    const current = today.slice(0, 7);
    const rateBp = await this.repo.getCollectionRateBp(targetBranch, current);
    const items = await Promise.all(
      [1, 2, 3].map(async (monthDistance) => {
        const month = addMonths(current, monthDistance);
        const { count, totalValue } = await this.repo.getMonthValue(targetBranch, month);
        const forecast = calculateRevenueForecast({
          activeValue: totalValue,
          historicalCollectionRateBp: rateBp,
          monthDistance,
        });
        return {
          month,
          expected: forecast.expected.toString(),
          lowerBound: forecast.lowerBound.toString(),
          upperBound: forecast.upperBound.toString(),
          activeEnrollmentsCount: count,
          historicalCollectionRateBp: rateBp,
        };
      }),
    );

    return { items };
  }

  /** 2. Ketish xavfi (churn risk) hisoboti (BR-36) */
  async getChurnRiskReport(actor: RequestUser, branchId?: string): Promise<ChurnRiskResponse> {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const today = this.clock.today();

    const rawInputs = await this.repo.getStudentsChurnInputs(targetBranch, today);
    // Ikki guruhda o'qiydigan o'quvchi — bitta qator.
    const byStudent = new Map<string, RawStudentChurnData>();
    for (const r of rawInputs) {
      const seen = byStudent.get(r.studentId);
      const groupName = [seen?.groupName, r.groupName].filter(Boolean).join(', ') || null;
      byStudent.set(r.studentId, { ...r, groupName });
    }
    const calculatedItems = [...byStudent.values()].map((input) => {
      const res = churnScore(input);
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

  /** 3. Guruh to'lishi prognozi (BR-36 churn modeli asosida) */
  async getGroupOccupancyForecast(
    actor: RequestUser,
    branchId?: string,
  ): Promise<GroupOccupancyResponse> {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const today = this.clock.today();
    const [groupsList, churnInputs] = await Promise.all([
      this.repo.getGroupOccupancies(targetBranch, today),
      this.repo.getStudentsChurnInputs(targetBranch, today),
    ]);

    const atRiskByGroup = new Map<string, number>();
    for (const input of churnInputs) {
      if (churnScore(input).isAtRisk) {
        atRiskByGroup.set(input.groupId, (atRiskByGroup.get(input.groupId) ?? 0) + 1);
      }
    }

    const items = groupsList.map((g) => {
      const projectedChurn = atRiskByGroup.get(g.groupId) ?? 0;
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

  /** 4. Tarixiy backtest hisoboti (BR-36 churn modeli asosida) */
  async getBacktestReport(actor: RequestUser, branchId?: string): Promise<BacktestReportResponse> {
    const targetBranch = this.resolveBranchId(actor, branchId);
    const prev = prevMonthRange(this.clock.today());
    // Backtest: prognoz o'tgan oy BOSHIDAGI holat bo'yicha, natija — o'sha oyda ketganlar.
    const churnInputs = await this.repo.getStudentsChurnInputs(targetBranch, prev.start);
    const predictedChurnCount = new Set(
      churnInputs.filter((i) => churnScore(i).isAtRisk).map((i) => i.studentId),
    ).size;

    const [actualChurnCount, active, rateBp, actualRevenue] = await Promise.all([
      this.repo.getActualChurnCount(targetBranch, prev.start, prev.endExclusive),
      this.repo.getMonthValue(targetBranch, prev.period),
      this.repo.getCollectionRateBp(targetBranch, prev.period),
      this.repo.getPaidRevenue(targetBranch, prev.start, prev.endExclusive),
    ]);
    // Tushum: o'sha oy boshidagi faol yozilishlar × yig'ilish koeffitsienti (1 oylik model).
    const { expected } = calculateRevenueForecast({
      activeValue: active.totalValue,
      historicalCollectionRateBp: rateBp,
      monthDistance: 1,
    });

    return {
      period: prev.period,
      predictedRevenue: expected.toString(),
      actualRevenue: actualRevenue.toString(),
      errorPercentage: errorPercent(expected, actualRevenue),
      predictedChurnCount,
      actualChurnCount,
    };
  }
}
