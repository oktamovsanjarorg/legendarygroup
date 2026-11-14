import { describe, expect, it } from 'vitest';
import { calculateAttendancePercent, calculatePercentageChange } from './dashboard.calculator.js';

describe('Dashboard Calculator (FR-DASH-1)', () => {
  it('foiz oʻzgarishini toʻgʻri hisoblaydi', () => {
    // 10M dan 12M ga oshsa -> +20%
    expect(calculatePercentageChange(12_000_000n, 10_000_000n)).toBe(20);
    // 10M dan 8M ga tushsa -> -20%
    expect(calculatePercentageChange(8_000_000n, 10_000_000n)).toBe(-20);
    // Oldingi oy nol bo'lsa
    expect(calculatePercentageChange(5_000_000n, 0n)).toBe(100);
    expect(calculatePercentageChange(0n, 0n)).toBe(0);
  });

  it('davomat foizini hisoblaydi', () => {
    expect(calculateAttendancePercent(18, 20)).toBe(90);
    expect(calculateAttendancePercent(0, 20)).toBe(0);
    expect(calculateAttendancePercent(20, 20)).toBe(100);
    // Darslar bo'lmasa 100%
    expect(calculateAttendancePercent(0, 0)).toBe(100);
  });
});
