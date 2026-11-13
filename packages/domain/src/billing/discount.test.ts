import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  applyDiscounts,
  bestDiscount,
  calculateDiscountAmount,
  validateAdminDiscount,
  type DiscountInput,
} from './discount.js';

describe('discount (BR-18)', () => {
  it('foizli chegirma hisobi', () => {
    expect(calculateDiscountAmount(600_000n, { type: 'percent', percent: 10 })).toBe(60_000n);
    expect(calculateDiscountAmount(650_000n, { type: 'percent', percent: 15 })).toBe(97_500n);
  });

  it('qatʼiy summa chegirmasi hisobi', () => {
    expect(calculateDiscountAmount(600_000n, { type: 'fixed', amount: 50_000n })).toBe(50_000n);
    // Chegirma asosiy narxdan katta boʻlsa, asosiy narx bilan cheklanadi
    expect(calculateDiscountAmount(600_000n, { type: 'fixed', amount: 700_000n })).toBe(600_000n);
  });

  it('BR-18: bir nechta chegirmadan soʻmdagi qiymati eng kattasi tanlanadi', () => {
    const discounts: DiscountInput[] = [
      { type: 'percent', percent: 5 }, // 30 000
      { type: 'fixed', amount: 50_000n }, // 50 000 (g'olib)
      { type: 'percent', percent: 7 }, // 42 000
    ];
    const best = bestDiscount(600_000n, discounts);
    expect(best).toEqual({ type: 'fixed', amount: 50_000n });

    const result = applyDiscounts(600_000n, discounts);
    expect(result).toEqual({
      basePrice: 600_000n,
      discountAmount: 50_000n,
      netPrice: 550_000n,
      applied: { type: 'fixed', amount: 50_000n },
    });
  });

  it('boʻsh chegirmalar roʻyxati narxni oʻzgartirmaydi', () => {
    expect(applyDiscounts(650_000n, [])).toEqual({
      basePrice: 650_000n,
      discountAmount: 0n,
      netPrice: 650_000n,
      applied: null,
    });
  });

  it('BR-18: Admin chegirma limiti (standart 10%)', () => {
    // 10% ruxsat etiladi
    expect(validateAdminDiscount(600_000n, { type: 'percent', percent: 10 }, 10)).toBe(true);
    // 15% rad etiladi (Director kerak)
    expect(validateAdminDiscount(600_000n, { type: 'percent', percent: 15 }, 10)).toBe(false);

    // 600 000 dan 10% = 60 000 so'm
    expect(validateAdminDiscount(600_000n, { type: 'fixed', amount: 60_000n }, 10)).toBe(true);
    expect(validateAdminDiscount(600_000n, { type: 'fixed', amount: 60_001n }, 10)).toBe(false);
  });

  it('BR-18 xossa: chegirma summasi [0, basePrice] oraligʻida va netPrice + discountAmount == basePrice', () => {
    const discountArb = fc.oneof(
      fc.record({
        type: fc.constant<'percent'>('percent'),
        percent: fc.integer({ min: 0, max: 150 }),
      }),
      fc.record({
        type: fc.constant<'fixed'>('fixed'),
        amount: fc.bigInt({ min: 0n, max: 2_000_000_000n }),
      }),
    );

    fc.assert(
      fc.property(
        fc.bigInt({ min: 0n, max: 1_000_000_000n }),
        fc.array(discountArb, { maxLength: 5 }),
        (basePrice, discounts) => {
          const res = applyDiscounts(basePrice, discounts);
          expect(res.discountAmount >= 0n).toBe(true);
          expect(res.discountAmount <= basePrice).toBe(true);
          expect(res.netPrice >= 0n).toBe(true);
          expect(res.discountAmount + res.netPrice).toBe(basePrice);
        },
      ),
    );
  });
});
