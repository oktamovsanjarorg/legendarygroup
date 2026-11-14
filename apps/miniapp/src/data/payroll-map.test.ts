import type { PayrollRunDetail } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import { payrollDetail, payrollMonths } from './payroll-map.js';

const item = (kind: string, amount: string, details: Record<string, unknown> = {}) => ({
  kind,
  amount,
  details,
});

describe('ustoz oyligi (T-402, BR-26/28)', () => {
  it('oylar: davr nomi, jami bigint', () => {
    expect(
      payrollMonths([{ runId: 'r', period: '2026-10', status: 'paid', totalNet: '7215000' }]),
    ).toEqual([{ id: 'r', title: 'oktabr, 2026', total: 7_215_000n, state: 'paid' }]);
  });

  it('qismlar yig‘indisi jamiga teng: jarima, avans, tuzatishlar ishorasi bilan', () => {
    const items = [
      item('fixed', '3000000'),
      item('percent', '3915000', { percentBp: 3000 }),
      item('per_lesson', '450000', { substituteLessons: 3 }),
      item('bonus', '150000'),
      item('penalty', '-300000'),
      item('advance', '-500000'),
      item('adjustment', '20000'),
      item('adjustment', '-5000'),
    ];
    const total = items.reduce((a, i) => a + BigInt(i.amount), 0n);
    const d = payrollDetail({
      id: 'r',
      period: '2026-10',
      status: 'approved',
      teachers: [{ teacherId: 't', teacherName: 'T', totalNet: total.toString(), items }],
    } as unknown as PayrollRunDetail);
    expect(d.percent).toEqual({ rate: 30, amount: 3_915_000n });
    expect(d.substituteLessons).toEqual({ count: 3, amount: 450_000n });
    expect([d.bonus, d.penalty, d.advance]).toEqual([170_000n, 305_000n, 500_000n]);
    const parts =
      d.fixed + d.percent.amount + d.substituteLessons.amount + d.bonus - d.penalty - d.advance;
    expect(parts).toBe(d.month.total);
  });
});
