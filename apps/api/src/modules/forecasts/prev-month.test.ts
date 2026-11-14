import { describe, expect, it } from 'vitest';
import { prevMonthRange } from './prev-month.js';

describe('BR-36 backtest: o‘tgan oy oralig‘i', () => {
  it('30 kunlik oy, fevral, yil almashinuvi, 31-sana', () => {
    expect(prevMonthRange('2026-12-05')).toEqual({
      period: '2026-11',
      start: '2026-11-01',
      endExclusive: '2026-12-01',
    });
    expect(prevMonthRange('2027-03-31')).toEqual({
      period: '2027-02',
      start: '2027-02-01',
      endExclusive: '2027-03-01',
    });
    expect(prevMonthRange('2027-01-10')).toEqual({
      period: '2026-12',
      start: '2026-12-01',
      endExclusive: '2027-01-01',
    });
  });
});
