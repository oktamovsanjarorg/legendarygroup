import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { computeLedgerNet, computeStudentBalance, isDebtCritical } from './ledger.js';

describe('ledger balance (BR-20, BR-22)', () => {
  it('misol: invoice +650 000, toʻlov -400 000 -> qarz 250 000, displayBalance -250 000', () => {
    const entries = [{ amount: 650_000n }, { amount: -400_000n }];
    const res = computeStudentBalance(entries);
    expect(res).toEqual({
      ledgerNet: 250_000n,
      debt: 250_000n,
      advance: 0n,
      displayBalance: -250_000n,
    });
  });

  it('avans: toʻlov -800 000, invoice +650 000 -> avans 150 000, displayBalance +150 000', () => {
    const entries = [{ amount: 650_000n }, { amount: -800_000n }];
    const res = computeStudentBalance(entries);
    expect(res).toEqual({
      ledgerNet: -150_000n,
      debt: 0n,
      advance: 150_000n,
      displayBalance: 150_000n,
    });
  });

  it('nol balans: toʻliq yopilgan', () => {
    const entries = [{ amount: 650_000n }, { amount: -650_000n }];
    const res = computeStudentBalance(entries);
    expect(res).toEqual({
      ledgerNet: 0n,
      debt: 0n,
      advance: 0n,
      displayBalance: 0n,
    });
  });

  it('BR-22: Kritik qarzdorlik', () => {
    // Qarz >= 1 oylik narx (650 000) va muddatdan >= 14 kun o'tgan
    expect(
      isDebtCritical({
        debt: 650_000n,
        monthlyPrice: 650_000n,
        overdueDays: 14,
      }),
    ).toBe(true);

    // 13 kun o'tgan — hali kritik emas
    expect(
      isDebtCritical({
        debt: 650_000n,
        monthlyPrice: 650_000n,
        overdueDays: 13,
      }),
    ).toBe(false);

    // Qarz 1 oylik narxdan kam (649 000) — kritik emas
    expect(
      isDebtCritical({
        debt: 649_000n,
        monthlyPrice: 650_000n,
        overdueDays: 20,
      }),
    ).toBe(false);
  });

  it('BR-20 xossa: debt va advance musbat, faqat biri nolga teng emas, displayBalance == -ledgerNet', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ amount: fc.bigInt({ min: -10_000_000n, max: 10_000_000n }) })),
        (entries) => {
          const sum = computeLedgerNet(entries);
          const res = computeStudentBalance(entries);
          expect(res.ledgerNet).toBe(sum);
          expect(res.displayBalance).toBe(-sum);
          if (sum > 0n) {
            expect(res.debt).toBe(sum);
            expect(res.advance).toBe(0n);
          } else if (sum < 0n) {
            expect(res.debt).toBe(0n);
            expect(res.advance).toBe(-sum);
          } else {
            expect(res.debt).toBe(0n);
            expect(res.advance).toBe(0n);
          }
        },
      ),
    );
  });
});
