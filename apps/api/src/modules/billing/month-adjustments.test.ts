import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyAdjustments, type PreparedLine } from './month-adjustments.js';

const line = (enrollmentId: string, amount: bigint): PreparedLine => ({
  enrollmentId,
  amount,
  description: 'oylik',
  kind: 'tuition',
});
const adj = (enrollmentId: string, credit: bigint, penalty = 0n) => ({
  enrollmentId,
  credit,
  creditNote: 'bekor qilingan 1 dars',
  penalty,
  penaltyNote: null,
});

describe('BR-2/BR-5 applyAdjustments', () => {
  it('kredit oʻz qatoridan; ortgani boshqa qatordan', () => {
    const out = applyAdjustments([line('a', 100n), line('b', 300n)], [adj('a', 150n)]);
    expect(out.map((l) => [l.amount, l.credit])).toEqual([
      [0n, 100n],
      [250n, 50n],
    ]);
  });

  it('Q-103: koʻchirilgan aʼzolik krediti yangi guruh qatoriga oʻtadi', () => {
    const [out] = applyAdjustments([line('yangi', 600n)], [adj('eski', 50n)]);
    expect([out?.amount, out?.credit]).toEqual([550n, 50n]);
  });

  it('jarima — alohida qator, kredit tegmaydi', () => {
    const out = applyAdjustments([line('a', 100n)], [adj('a', 0n, 20n)]);
    expect(out.map((l) => [l.kind, l.amount])).toEqual([
      ['tuition', 100n],
      ['penalty', 20n],
    ]);
  });

  it('xossa: manfiy qator yoʻq; jami kamayish = min(jami kredit, jami oʻqish)', () => {
    const big = fc.bigInt({ min: 0n, max: 1_000_000n });
    fc.assert(
      fc.property(
        fc.array(big, { minLength: 1, maxLength: 4 }),
        fc.array(big),
        (amounts, credits) => {
          const lines = amounts.map((a, i) => line(String(i), a));
          const out = applyAdjustments(
            lines,
            credits.map((c, i) => adj(String(i), c)),
          );
          const sum = (xs: bigint[]) => xs.reduce((s, x) => s + x, 0n);
          const total = sum(amounts);
          const credit = sum(credits);
          expect(out.every((l) => l.amount >= 0n)).toBe(true);
          expect(sum(out.map((l) => l.amount))).toBe(credit < total ? total - credit : 0n);
        },
      ),
    );
  });
});
