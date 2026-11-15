import { describe, expect, it } from 'vitest';
import { addMonths, minusDays } from './forecasts-history.js';
import { errorPercent } from './forecasts.service.js';

describe('FR-DASH-3 prognoz yordamchilari', () => {
  it('oy qoʻshish: yil oʻtishi; 31-sana muammosi yoʻq', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12');
    expect(addMonths('2026-11', 3)).toBe('2027-02');
    expect(addMonths('2027-01', -1)).toBe('2026-12');
  });

  it('kun ayirish: oy va yil chegarasi', () => {
    expect(minusDays('2026-03-01', 1)).toBe('2026-02-28');
    expect(minusDays('2027-01-10', 28)).toBe('2026-12-13');
  });

  it('backtest xatosi: 0.1% aniqlik, haqiqiy 0 — 0', () => {
    expect(errorPercent(12_500_000n, 12_100_000n)).toBe(3.3);
    expect(errorPercent(900n, 1_000n)).toBe(10);
    expect(errorPercent(5n, 0n)).toBe(0);
  });
});
