import type { NewPayrollItemRow, TeacherContractRow } from '@lg/db';
import {
  calculateFixedSalary,
  calculatePercentSalary,
  calculateSubstituteSalary,
} from '@lg/domain';
import { Inject, Injectable } from '@nestjs/common';
import { type GroupScope, PayrollMetricsRepository } from './payroll-metrics.repository.js';
import { PayrollRepository } from './payroll.repository.js';

type Item = Omit<NewPayrollItemRow, 'runId'>;
type GroupContract = TeacherContractRow & { groupId: string };

const isGroupContract = (c: TeacherContractRow): c is GroupContract => c.groupId !== null;

/**
 * Ustoz shartnomalari: guruhga bog'langan shartnoma (`groupId`) — faqat o'sha guruh; umumiy
 * shartnoma — qolgan guruhlar. Bir nechta umumiy shartnoma bo'lsa — eng so'nggi `validFrom`.
 */
export function splitContracts(contracts: TeacherContractRow[]): {
  general: TeacherContractRow | undefined;
  perGroup: GroupContract[];
} {
  const perGroup = contracts.filter(isGroupContract);
  const general = contracts
    .filter((c) => c.groupId === null)
    .sort((a, b) => b.validFrom.localeCompare(a.validFrom))[0];
  return { general, perGroup };
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
    ctx: { runId: string; period: string },
  ): Promise<{ items: Item[]; advanceIds: string[] }> {
    const { general, perGroup } = splitContracts(contracts);
    const items: Item[] = [];
    for (const c of perGroup) {
      items.push(...(await this.contractItems(c, ctx.period, { only: c.groupId, exclude: [] })));
    }
    if (general) {
      const exclude = perGroup.map((c) => c.groupId);
      items.push(...(await this.contractItems(general, ctx.period, { exclude })));
    }
    const rate = (general ?? perGroup[0])?.perLessonRate ?? 0n;
    const subCount = await this.metrics.substituteLessonsTaught(teacherId, ctx.period);
    if (subCount > 0 && rate > 0n) {
      items.push({
        teacherId,
        kind: 'per_lesson',
        amount: calculateSubstituteSalary(subCount, rate),
        details: { substituteLessons: subCount, rate: rate.toString() },
        note: `Oʻrinbosar darslari (${subCount} ta)`,
      });
    }
    const advances = await this.repo.findAdvancesForRun(teacherId, ctx.runId, ctx.period);
    for (const adv of advances) {
      items.push({
        teacherId,
        kind: 'advance',
        amount: -adv.amount,
        details: { advanceId: adv.id, givenAt: adv.givenAt },
        note: adv.note ?? 'Avans ushlab qolindi',
      });
    }
    return { items, advanceIds: advances.map((a) => a.id) };
  }

  private async contractItems(c: TeacherContractRow, period: string, scope: GroupScope) {
    const items: Item[] = [];
    const base = { teacherId: c.teacherId };
    if (c.type === 'fixed' || c.type === 'mixed') {
      const m = await this.metrics.lessonMetrics(c.teacherId, period, scope);
      items.push({
        ...base,
        kind: 'fixed',
        amount: calculateFixedSalary(
          c.fixedAmount,
          m.totalScheduledLessons,
          m.substituteLessonsTaughtByOthers,
        ),
        details: {
          contractId: c.id,
          originalFixed: c.fixedAmount.toString(),
          scheduledLessons: m.totalScheduledLessons,
          substituteLessons: m.substituteLessonsTaughtByOthers,
        },
        note: 'Fiks oylik',
      });
    }
    if (c.type === 'percent' || c.type === 'mixed') {
      const collected = await this.metrics.collectedBase(c.teacherId, period, scope);
      items.push({
        ...base,
        kind: 'percent',
        amount: calculatePercentSalary(collected, c.percentBp),
        details: { contractId: c.id, collectedBase: collected.toString(), percentBp: c.percentBp },
        note: `${c.percentBp / 100}% ulush`,
      });
    }
    return items;
  }
}
