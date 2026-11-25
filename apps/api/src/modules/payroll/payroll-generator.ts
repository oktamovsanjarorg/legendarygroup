import type { NewPayrollItemRow, TeacherContractRow } from '@lg/db';
import {
  calculateFixedSalary,
  calculatePercentSalary,
  calculateSubstituteSalary,
  prorate,
} from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { PayrollMetricsRepository } from './payroll-metrics.repository.js';
import { type ContractWindow, contractWindows, windowDays } from './payroll-windows.js';
import type { OutstandingAdvance } from './payroll-terms.repository.js';
import { PayrollRepository } from './payroll.repository.js';

type Item = Omit<NewPayrollItemRow, 'runId'>;
const sum = (items: readonly { amount: bigint }[]) => items.reduce((s, i) => s + i.amount, 0n);

/**
 * BR-28, Q-104: avans ishlangan summadan oshmagan qismida ushlanadi, qolgani keyingi hisobga
 * o'tadi — aks holda bitta katta avans butun oy tasdiqlanishini to'sib qo'yardi.
 */
export function withhold(
  teacherId: string,
  advances: readonly OutstandingAdvance[],
  available: bigint,
): { items: Item[]; settled: string[] } {
  const items: Item[] = [];
  const settled: string[] = [];
  let left = available;
  for (const adv of advances) {
    const remaining = adv.amount - adv.withheld;
    const take = remaining < left ? remaining : left;
    if (take <= 0n) continue;
    left -= take;
    if (take === remaining) settled.push(adv.id);
    items.push({
      teacherId,
      kind: 'advance',
      amount: -take,
      details: { advanceId: adv.id, givenAt: adv.givenAt, total: adv.amount.toString() },
      note: adv.note ?? 'Avans ushlab qolindi',
    });
  }
  return { items, settled };
}

@Injectable()
export class PayrollGenerator {
  constructor(
    @Inject(PayrollMetricsRepository) private readonly metrics: PayrollMetricsRepository,
    @Inject(PayrollRepository) private readonly repo: PayrollRepository,
  ) {}

  /** Bitta ustoz uchun avtomatik qatorlar va ushlanadigan avanslar (BR-23…BR-25, BR-28). */
  async teacherItems(
    teacherId: string,
    contracts: TeacherContractRow[],
    ctx: { runId: string; period: string; advances: readonly OutstandingAdvance[] },
  ): Promise<{ items: Item[]; advanceIds: string[] }> {
    const windows = contractWindows(contracts, ctx.period);
    const items: Item[] = [];
    for (const w of windows) items.push(...(await this.contractItems(w, ctx.period)));
    const main = windows.filter((w) => w.latest);
    const rate = (main.find((w) => w.contract.groupId === null) ?? main[0])?.contract.perLessonRate;
    const subCount = await this.metrics.substituteLessonsTaught(teacherId, ctx.period);
    if (subCount > 0 && rate) {
      items.push({
        teacherId,
        kind: 'per_lesson',
        amount: calculateSubstituteSalary(subCount, rate),
        details: { substituteLessons: subCount, rate: rate.toString() },
        note: `Oʻrinbosar darslari (${subCount} ta)`,
      });
    }
    const available = sum(items) + (await this.repo.manualNet(ctx.runId, teacherId));
    const held = withhold(teacherId, ctx.advances, available);
    return { items: [...items, ...held.items], advanceIds: held.settled };
  }

  private async contractItems(w: ContractWindow, period: string): Promise<Item[]> {
    const { contract: c } = w;
    const items: Item[] = [];
    if (c.type === 'fixed' || c.type === 'mixed') items.push(await this.fixedItem(w, period));
    if (c.type === 'percent' || c.type === 'mixed') {
      const baseAmount = await this.percentBase(w, period);
      items.push({
        teacherId: c.teacherId,
        kind: 'percent',
        amount: calculatePercentSalary(baseAmount, c.percentBp),
        details: {
          contractId: c.id,
          base: c.base,
          collectedBase: baseAmount.toString(),
          percentBp: c.percentBp,
        },
        note: `${c.percentBp / 100}% ulush`,
      });
    }
    return items;
  }

  /** BR-25: o'rinbosar ulushi; Q-104: oyning bir qismida amal qilsa — kunlarga mutanosib. */
  private async fixedItem(w: ContractWindow, period: string): Promise<Item> {
    const { contract: c } = w;
    const { days, total } = windowDays(w.segments, period);
    const earnedFixed = days === total ? c.fixedAmount : prorate(c.fixedAmount, days, total);
    let lessons = 0;
    let byOthers = 0;
    for (const seg of w.segments) {
      const m = await this.metrics.lessonMetrics(c.teacherId, seg);
      lessons += m.totalScheduledLessons;
      byOthers += m.substituteLessonsTaughtByOthers;
    }
    return {
      teacherId: c.teacherId,
      kind: 'fixed',
      amount: calculateFixedSalary(earnedFixed, lessons, byOthers),
      details: {
        contractId: c.id,
        originalFixed: c.fixedAmount.toString(),
        scheduledLessons: lessons,
        substituteLessons: byOthers,
        ...(days < total ? { days, totalDays: total } : {}),
      },
      note: days < total ? `Fiks oylik (${days}/${total} kun)` : 'Fiks oylik',
    };
  }

  private async percentBase(w: ContractWindow, period: string): Promise<bigint> {
    const { contract: c } = w;
    if (c.base === 'accrued') {
      const last = w.segments.at(-1);
      if (!w.latest || !last) return 0n;
      return this.metrics.accruedBase(c.teacherId, period, last.scope);
    }
    let base = 0n;
    for (const seg of w.segments)
      base += await this.metrics.collectedBase(c.teacherId, period, seg);
    return base;
  }
}
