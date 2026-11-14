import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  calculateFreezeCredit,
  calculateLessonCredit,
  calculateMidMonthEnrollmentPrice,
  calculatePenalty,
  lateToUnexcusedAbsences,
} from './credits-penalties.js';

describe('credits-penalties (BR-3, BR-5, BR-8, BR-9, BR-10)', () => {
  describe('calculateMidMonthEnrollmentPrice (BR-3)', () => {
    it('12 darsdan 7 tasi qolganda 600 000 soʻmlik kurs: 350 000 soʻm', () => {
      // 600 000 * 7 / 12 = 350 000
      expect(calculateMidMonthEnrollmentPrice(600_000n, 7, 12)).toBe(350_000n);
    });

    it('1000 soʻmga karrali qilib pastga yaxlitlaydi', () => {
      // 650 000 * 5 / 12 = 270 833.33 -> 270 000
      expect(calculateMidMonthEnrollmentPrice(650_000n, 5, 12)).toBe(270_000n);
    });

    it('barcha darslar qolgan boʻlsa toʻliq narx', () => {
      expect(calculateMidMonthEnrollmentPrice(650_000n, 12, 12)).toBe(650_000n);
    });

    it('BR-3 xossa: natija har doim 1000 ga karrali va <= monthlyPrice', () => {
      fc.assert(
        fc.property(
          fc.bigInt({ min: 10_000n, max: 2_000_000n }),
          fc.integer({ min: 1, max: 31 }),
          fc.integer({ min: 1, max: 31 }),
          (price, rem, total) => {
            const res = calculateMidMonthEnrollmentPrice(price, rem, total);
            expect(res % 1000n).toBe(0n);
            expect(res <= price).toBe(true);
          },
        ),
      );
    });
  });

  describe('calculateLessonCredit (BR-5)', () => {
    it('12 darsdan 2 tasi bekor qilinsa: 600 000 * 2 / 12 = 100 000 kredit', () => {
      expect(calculateLessonCredit(600_000n, 2, 12)).toBe(100_000n);
    });

    it('bekor qilingan dars 0 boʻlsa kredit 0n', () => {
      expect(calculateLessonCredit(600_000n, 0, 12)).toBe(0n);
    });
  });

  describe('calculateFreezeCredit (BR-9)', () => {
    it('muzlatilgan 4 dars uchun kredit: 650 000 * 4 / 12 = 216 666 kredit', () => {
      expect(calculateFreezeCredit(650_000n, 4, 12)).toBe(216_666n);
    });
  });

  describe('lateToUnexcusedAbsences & calculatePenalty (BR-8, BR-10)', () => {
    it('3 ta kech qolish = 1 ta sababsiz', () => {
      expect(lateToUnexcusedAbsences(2)).toBe(0);
      expect(lateToUnexcusedAbsences(3)).toBe(1);
      expect(lateToUnexcusedAbsences(5)).toBe(1);
      expect(lateToUnexcusedAbsences(6)).toBe(2);
    });

    it('standart holatda jarima oʻchirilgan (penaltyPerLesson = 0n)', () => {
      expect(calculatePenalty({ unexcusedAbsences: 5, lateCount: 6 })).toBe(0n);
    });

    it('jarima yoqilganda (threshold 3, 20 000 soʻm): 4 ta sababsiz + 3 ta kech (jami 5) -> (5 - 3) * 20 000 = 40 000', () => {
      const penalty = calculatePenalty({
        unexcusedAbsences: 4,
        lateCount: 3, // +1 ta sababsiz -> jami 5 ta
        threshold: 3,
        penaltyPerLesson: 20_000n,
      });
      expect(penalty).toBe(40_000n);
    });

    it('thresholddan oshmasa jarima 0n', () => {
      const penalty = calculatePenalty({
        unexcusedAbsences: 2,
        lateCount: 2,
        threshold: 3,
        penaltyPerLesson: 20_000n,
      });
      expect(penalty).toBe(0n);
    });
  });
});
