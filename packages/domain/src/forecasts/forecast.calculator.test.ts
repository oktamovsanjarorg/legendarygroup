import { describe, expect, it } from 'vitest';
import {
  calculateChurnScore,
  calculateGroupOccupancy,
  calculateRevenueForecast,
} from './forecast.calculator.js';

describe('Forecast & Churn Domain Calculator', () => {
  describe('calculateChurnScore (BR-36)', () => {
    it('muammosiz oʻquvchi uchun 0 ball beradi va xavfli emas', () => {
      const result = calculateChurnScore({
        attendanceDropPercent: 0,
        paymentDelayDays: 0,
        gradeDropPercent: 0,
        botUnresponsive: false,
      });

      expect(result.score).toBe(0);
      expect(result.isAtRisk).toBe(false);
      expect(result.factors).toHaveLength(4);
    });

    it('barcha omillar kritik boʻlganda 100 ball beradi va xavfli (>= 60)', () => {
      const result = calculateChurnScore({
        attendanceDropPercent: 100, // 40 ball
        paymentDelayDays: 45, // 30 ball (maksimal)
        gradeDropPercent: 100, // 20 ball
        botUnresponsive: true, // 10 ball
      });

      expect(result.score).toBe(100);
      expect(result.isAtRisk).toBe(true);
    });

    it('ball 60 dan kam boʻlsa xavfli emas, 60 va undan yuqori boʻlsa xavfli', () => {
      // 50% davomat pasayishi (20) + 15 kun toʻlov (15) + bot (10) = 45 ball (< 60)
      const nonRisk = calculateChurnScore({
        attendanceDropPercent: 50,
        paymentDelayDays: 15,
        gradeDropPercent: 0,
        botUnresponsive: true,
      });
      expect(nonRisk.score).toBe(45);
      expect(nonRisk.isAtRisk).toBe(false);

      // 75% davomat pasayishi (30) + 30 kun toʻlov (30) = 60 ball (>= 60 xavfli)
      const atRisk = calculateChurnScore({
        attendanceDropPercent: 75,
        paymentDelayDays: 30,
        gradeDropPercent: 0,
        botUnresponsive: false,
      });
      expect(atRisk.score).toBe(60);
      expect(atRisk.isAtRisk).toBe(true);
    });
  });

  describe('calculateRevenueForecast (FR-DASH-3)', () => {
    it('1 oylik tushum prognozi va 5% ishonch oraligʻini toʻgʻri hisoblaydi', () => {
      // 10 000 000 so'm bazaviy, 90% yig'ilish = 9 000 000 so'm kutilma
      const res = calculateRevenueForecast({
        activeValue: 10000000n,
        historicalCollectionRateBp: 9000,
        monthDistance: 1,
      });

      expect(res.expected).toBe(9000000n);
      // 5% margin = 450 000
      expect(res.lowerBound).toBe(8550000n);
      expect(res.upperBound).toBe(9450000n);
    });

    it('3 oylik masofada ishonch oraligʻi kengayadi (15%)', () => {
      const res = calculateRevenueForecast({
        activeValue: 10000000n,
        historicalCollectionRateBp: 9000,
        monthDistance: 3,
      });

      expect(res.expected).toBe(9000000n);
      // 15% margin = 1 350 000
      expect(res.lowerBound).toBe(7650000n);
      expect(res.upperBound).toBe(10350000n);
    });
  });

  describe('calculateGroupOccupancy', () => {
    it('guruh toʻlishi va prognoz churnni toʻgʻri hisoblaydi', () => {
      // sig'im 20, hozir 16 (80%), prognoz ketish 2 ta -> qoladi 14 (70%)
      const res = calculateGroupOccupancy(20, 16, 2);
      expect(res.occupancyRateBp).toBe(8000);
      expect(res.projectedOccupancyRateBp).toBe(7000);
    });
  });
});
