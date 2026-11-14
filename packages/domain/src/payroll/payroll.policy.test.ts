import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  calculateFixedSalary,
  calculateNetSalary,
  calculatePercentSalary,
  calculateSubstituteSalary,
} from './payroll.policy.js';

describe('T-401 · Payroll domen mantiqi (Payroll Policies)', () => {
  describe('BR-23 & BR-25: Fiks qismini hisoblash va oʻrinbosar prorate (calculateFixedSalary)', () => {
    it('oʻrinbosar boʻlmasa fiks summa toʻliq beriladi', () => {
      const fixed = 6_000_000n;
      expect(calculateFixedSalary(fixed, 12, 0)).toBe(6_000_000n);
    });

    it('agar 12 darsdan 3 tasini oʻrinbosar oʻtgan boʻlsa, 25% qisqaradi', () => {
      const fixed = 6_000_000n;
      // 6_000_000 - (6_000_000 * 3 / 12) = 4_500_000
      expect(calculateFixedSalary(fixed, 12, 3)).toBe(4_500_000n);
    });

    it('barcha darslarni oʻrinbosar oʻtgan boʻlsa 0 qaytaradi', () => {
      const fixed = 6_000_000n;
      expect(calculateFixedSalary(fixed, 12, 12)).toBe(0n);
    });

    it('darslar soni 0 boʻlsa toʻliq fiks qaytariladi', () => {
      expect(calculateFixedSalary(5_000_000n, 0, 0)).toBe(5_000_000n);
    });
  });

  describe('BR-23 & BR-24: Foiz hisob-kitobi (calculatePercentSalary)', () => {
    it('toʻgʻri foiz bazis punktlari boʻyicha hisoblanadi', () => {
      const collected = 20_000_000n;
      // 35% = 3500 bp -> 7_000_000
      expect(calculatePercentSalary(collected, 3500)).toBe(7_000_000n);
      // 50% = 5000 bp -> 10_000_000
      expect(calculatePercentSalary(collected, 5000)).toBe(10_000_000n);
    });

    it('0 yoki manfiy bazada 0 qaytaradi', () => {
      expect(calculatePercentSalary(0n, 4000)).toBe(0n);
      expect(calculatePercentSalary(-100n, 4000)).toBe(0n);
      expect(calculatePercentSalary(10_000_000n, 0)).toBe(0n);
    });
  });

  describe('BR-25: Oʻrinbosar dars stavkasi (calculateSubstituteSalary)', () => {
    it('oʻtilgan darslar soni boʻyicha stavkaga koʻpaytiriladi', () => {
      const rate = 150_000n;
      expect(calculateSubstituteSalary(4, rate)).toBe(600_000n);
      expect(calculateSubstituteSalary(0, rate)).toBe(0n);
    });
  });

  describe('BR-27 & BR-28: Jami toʻlanadigan oylik (calculateNetSalary)', () => {
    it('fiks, foiz, oʻrinbosar, bonus, jarima va avanslarni toʻgʻri hisoblaydi', () => {
      const items = [
        { kind: 'fixed', amount: 4_500_000n },
        { kind: 'percent', amount: 3_000_000n },
        { kind: 'per_lesson', amount: 300_000n },
        { kind: 'bonus', amount: 500_000n },
        { kind: 'penalty', amount: -200_000n },
        { kind: 'advance', amount: -1_000_000n },
      ];
      // 4.5M + 3M + 300k + 500k - 200k - 1M = 7.1M
      expect(calculateNetSalary(items)).toBe(7_100_000n);
    });

    it('agar chegirmalar oylikdan oshib ketsa, minimal 0n qaytaradi (manfiy oylik yoʻq)', () => {
      const items = [
        { kind: 'fixed', amount: 1_000_000n },
        { kind: 'advance', amount: -1_500_000n },
      ];
      expect(calculateNetSalary(items)).toBe(0n);
    });
  });

  describe('Property-based testing (fast-check)', () => {
    it('fiks qism hech qachon boshlangʻich fiks summadan katta boʻlmaydi', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 1_000_000_000n }),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 0, max: 100 }),
          (fixed, total, subs) => {
            const res = calculateFixedSalary(fixed, total, subs);
            expect(res <= fixed).toBe(true);
            expect(res >= 0n).toBe(true);
          },
        ),
      );
    });

    it('foiz qism hech qachon baza summasidan katta boʻlmaydi', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 0n, max: 1_000_000_000n }),
          fc.integer({ min: 0, max: 10000 }),
          (base, bp) => {
            const res = calculatePercentSalary(base, bp);
            expect(res <= base).toBe(true);
            expect(res >= 0n).toBe(true);
          },
        ),
      );
    });
  });
});
