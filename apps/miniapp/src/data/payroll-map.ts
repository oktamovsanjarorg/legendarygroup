import type { OwnPayrollMonth, PayrollItem, PayrollRunDetail } from '@lg/contracts';
import { formatMonth } from '@lg/i18n';
import type { PayrollDetail, PayrollMonth } from '../screens/teacher/payroll.js';
import { atTashkent } from './time.js';

/** `2026-11` → "noyabr, 2026". */
const monthTitle = (period: string) => formatMonth(atTashkent(`${period}-15`, '12:00'));

export const payrollMonths = (rows: readonly OwnPayrollMonth[]): PayrollMonth[] =>
  rows.map((r) => ({
    id: r.runId,
    title: monthTitle(r.period),
    total: BigInt(r.totalNet),
    state: r.status,
  }));

const sum = (items: readonly PayrollItem[], kind: PayrollItem['kind']) =>
  items.filter((i) => i.kind === kind).reduce((a, i) => a + BigInt(i.amount), 0n);

const num = (v: unknown) => (typeof v === 'number' ? v : Number(v ?? 0));

/**
 * Oy tafsiloti (FR-SAL-3): qismlar yig'indisi jamiga teng bo'ladi — tuzatishlar (adjustment)
 * ishorasiga qarab bonus yoki jarimaga qo'shiladi, avans alohida ushlanadi.
 */
export function payrollDetail(run: PayrollRunDetail): PayrollDetail {
  const items = run.teachers[0]?.items ?? [];
  const percentItem = items.find((i) => i.kind === 'percent');
  const sub = items.filter((i) => i.kind === 'per_lesson');
  const adj = items.filter((i) => i.kind === 'adjustment').map((i) => BigInt(i.amount));
  const plus = adj.filter((a) => a > 0n).reduce((a, b) => a + b, 0n);
  const minus = adj.filter((a) => a < 0n).reduce((a, b) => a - b, 0n);
  return {
    month: {
      id: run.id,
      title: monthTitle(run.period),
      total: BigInt(run.teachers[0]?.totalNet ?? '0'),
      state: run.status,
    },
    fixed: sum(items, 'fixed'),
    percent: { rate: num(percentItem?.details['percentBp']) / 100, amount: sum(items, 'percent') },
    substituteLessons: {
      count: sub.reduce((a, i) => a + num(i.details['substituteLessons']), 0),
      amount: sum(items, 'per_lesson'),
    },
    bonus: sum(items, 'bonus') + plus,
    penalty: -sum(items, 'penalty') + minus,
    advance: -sum(items, 'advance'),
    byStudent: [],
  };
}
