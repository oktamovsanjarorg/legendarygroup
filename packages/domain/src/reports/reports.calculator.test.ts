import { describe, expect, it } from 'vitest';
import {
  calculateAttendanceRateBp,
  calculateConversionRateBp,
  calculateRetentionRateBp,
  calculateTeacherCompositeScore,
  classifyDebtAgingBucket,
} from './reports.calculator.js';

describe('Reports Domain Calculator', () => {
  describe('classifyDebtAgingBucket', () => {
    it('kun oraligʻi boʻyicha toʻgʻri guruhga ajratadi', () => {
      expect(classifyDebtAgingBucket(0)).toBe('fresh');
      expect(classifyDebtAgingBucket(5)).toBe('fresh');
      expect(classifyDebtAgingBucket(7)).toBe('fresh');
      expect(classifyDebtAgingBucket(8)).toBe('overdue');
      expect(classifyDebtAgingBucket(20)).toBe('overdue');
      expect(classifyDebtAgingBucket(30)).toBe('overdue');
      expect(classifyDebtAgingBucket(31)).toBe('critical');
      expect(classifyDebtAgingBucket(90)).toBe('critical');
    });
  });

  describe('calculateAttendanceRateBp', () => {
    it('darslar boʻlmaganda 0 qaytaradi', () => {
      expect(calculateAttendanceRateBp(0, 0, 0)).toBe(0);
    });

    it('toʻliq qatnashgan holatda 10000 bp (100%) beradi', () => {
      expect(calculateAttendanceRateBp(20, 0, 20)).toBe(10000);
    });

    it('kechikkanlarni 0.5 koeffitsient bilan hisoblaydi', () => {
      // 18 ta qatnashgan, 2 ta kechikkan (18 + 1 = 19) / 20 = 95% = 9500 bp
      expect(calculateAttendanceRateBp(18, 2, 20)).toBe(9500);
    });
  });

  describe('calculateConversionRateBp', () => {
    it('lidlar boʻlmaganda 0 qaytaradi', () => {
      expect(calculateConversionRateBp(0, 0)).toBe(0);
    });

    it('konversiya foizini toʻgʻri hisoblaydi', () => {
      // 25 / 100 = 25% = 2500 bp
      expect(calculateConversionRateBp(25, 100)).toBe(2500);
    });
  });

  describe('calculateRetentionRateBp', () => {
    it('boshlangʻich oʻquvchi boʻlmaganda 0 qaytaradi', () => {
      expect(calculateRetentionRateBp(0, 0)).toBe(0);
    });

    it('saqlanish foizini toʻgʻri hisoblaydi', () => {
      // 18 / 20 = 90% = 9000 bp
      expect(calculateRetentionRateBp(18, 20)).toBe(9000);
    });
  });

  describe('calculateTeacherCompositeScore', () => {
    it('vaznlangan kompozit samaradorlik ballini hisoblaydi', () => {
      // 8000*0.4 + 9000*0.4 + 7000*0.2 = 3200 + 3600 + 1400 = 8200 bp
      const score = calculateTeacherCompositeScore({
        attendanceBp: 8000,
        retentionBp: 9000,
        gradeScoreBp: 7000,
      });
      expect(score).toBe(8200);
    });
  });
});
