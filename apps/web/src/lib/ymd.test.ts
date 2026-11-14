import { describe, expect, it } from 'vitest';
import { addDays, addMonths, monthGrid, weekdayOf, weekStart } from './ymd.js';

describe('kalendar kuni arifmetikasi', () => {
  it('hafta dushanbadan boshlanadi; yakshanba — 7', () => {
    expect(weekdayOf('2026-11-15')).toBe(7);
    expect(weekStart('2026-11-15')).toBe('2026-11-09');
    expect(weekStart('2026-11-09')).toBe('2026-11-09');
  });
  it('oy/yil chegarasidan o‘tadi', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addMonths('2026-12-15', 1)).toBe('2027-01-01');
    expect(addMonths('2026-01-31', -1)).toBe('2025-12-01');
  });
  it("oy to'ri — to'liq haftalar, ≤ 42 kun (API chegarasi 62 kun)", () => {
    const nov = monthGrid('2026-11-13');
    expect(nov[0]).toBe('2026-10-26');
    expect(nov.at(-1)).toBe('2026-12-06');
    expect(nov.length % 7).toBe(0);
    expect(monthGrid('2027-02-10')).toHaveLength(28);
    expect(monthGrid('2026-08-01')).toHaveLength(42);
  });
});
