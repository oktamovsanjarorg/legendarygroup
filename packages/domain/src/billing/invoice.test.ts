import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeInvoiceTotal, planEnrollmentInvoiceLines } from './invoice.js';

describe('invoice lines & total (BR-1, BR-3, BR-5, BR-6, BR-8, BR-9, BR-18)', () => {
  it('oddiy oylik invoice: 650 000 soʻm', () => {
    const lines = planEnrollmentInvoiceLines({
      enrollmentId: 'e-1',
      groupName: 'General English',
      monthlyPrice: 650_000n,
    });

    expect(lines).toEqual([
      {
        enrollmentId: 'e-1',
        kind: 'tuition',
        amount: 650_000n,
        description: 'General English — oylik kurs toʻlovi',
      },
    ]);
    expect(computeInvoiceTotal(lines)).toBe(650_000n);
  });

  it('chegirma, bekor qilingan dars krediti va jarima bilan murakkab invoice', () => {
    const lines = planEnrollmentInvoiceLines({
      enrollmentId: 'e-1',
      groupName: 'IELTS',
      monthlyPrice: 1_000_000n,
      discounts: [{ type: 'percent', percent: 10 }], // -100 000
      lessonCredit: 83_333n, // -83 333
      penalty: 20_000n, // +20 000
    });

    expect(lines).toHaveLength(4);
    expect(lines[0]?.amount).toBe(1_000_000n);
    expect(lines[1]?.amount).toBe(-100_000n);
    expect(lines[2]?.amount).toBe(-83_333n);
    expect(lines[3]?.amount).toBe(20_000n);

    // 1_000_000 - 100_000 - 83_333 + 20_000 = 836_667
    expect(computeInvoiceTotal(lines)).toBe(836_667n);
  });

  it('oy oʻrtasida qoʻshilgan oʻquvchi (BR-3) proporsional narx', () => {
    const lines = planEnrollmentInvoiceLines({
      enrollmentId: 'e-1',
      groupName: 'Matematika',
      monthlyPrice: 600_000n,
      midMonth: {
        remainingLessons: 6,
        totalLessonsInMonth: 12,
      },
    });

    expect(lines[0]?.amount).toBe(300_000n);
    expect(computeInvoiceTotal(lines)).toBe(300_000n);
  });

  it('kreditlar narxdan oshib ketsa jami 0n boʻladi', () => {
    const lines = [{ amount: 500_000n }, { amount: -600_000n }];
    expect(computeInvoiceTotal(lines)).toBe(0n);
  });

  it('xossa: computeInvoiceTotal har doim >= 0n', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ amount: fc.bigInt({ min: -5_000_000n, max: 5_000_000n }) })),
        (lines) => {
          expect(computeInvoiceTotal(lines) >= 0n).toBe(true);
        },
      ),
    );
  });
});
