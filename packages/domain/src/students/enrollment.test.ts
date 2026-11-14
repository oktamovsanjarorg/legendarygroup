import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays } from '../policies/index.js';
import {
  daysInclusive,
  enrollmentState,
  peakConcurrency,
  transferSplit,
  validateFreeze,
} from './enrollment.js';

const e = (from: string, to: string | null = null) => ({ from, to });

describe('enrollmentState — BR-32 (sanadan oldin/keyin koʻrinmaydi)', () => {
  const span = e('2026-09-10', '2026-12-31');
  const freeze = [e('2026-10-01', '2026-10-20')];
  it.each([
    ['2026-09-09', 'upcoming'],
    ['2026-09-10', 'active'],
    ['2026-10-05', 'frozen'],
    ['2026-10-21', 'active'],
    ['2026-12-31', 'active'],
    ['2027-01-01', 'ended'],
  ])('%s → %s', (day, state) => expect(enrollmentState(span, freeze, day)).toBe(state));
});

describe('peakConcurrency — guruh sigʻimi', () => {
  it('ketma-ket (biri ketib, biri kelgan) — bir vaqtda 1', () => {
    expect(peakConcurrency([e('2026-09-01', '2026-09-30')], e('2026-10-01'))).toBe(0);
    expect(peakConcurrency([e('2026-09-01', '2026-09-30'), e('2026-10-01')], e('2026-09-15'))).toBe(
      1,
    );
  });
  it('kelajakda boshlanadiganlar ham hisobga olinadi', () => {
    expect(peakConcurrency([e('2026-09-01'), e('2026-11-01')], e('2026-10-01'))).toBe(2);
  });
  it('property: natija 0..n va har nuqtadagi sondan kam emas', () => {
    const ymd = fc.integer({ min: 0, max: 200 }).map((n) => addDays('2026-09-01', n));
    const span = fc
      .tuple(ymd, fc.option(ymd, { nil: null }))
      .map(([a, b]) => (b !== null && b < a ? e(b, a) : e(a, b)));
    fc.assert(
      fc.property(fc.array(span, { maxLength: 8 }), span, ymd, (xs, w, probe) => {
        const peak = peakConcurrency(xs, w);
        expect(peak).toBeLessThanOrEqual(xs.length);
        const inW = probe >= w.from && (w.to === null || probe <= w.to);
        if (!inW) return;
        const atProbe = xs.filter((x) => x.from <= probe && (x.to === null || x.to >= probe));
        expect(peak).toBeGreaterThanOrEqual(atProbe.length);
      }),
    );
  });
});

describe('validateFreeze — BR-9', () => {
  const enr = e('2026-09-01', '2027-05-31');
  it('≥ 14 kun, davr ichida, kesishmaydi', () => {
    expect(validateFreeze(enr, [], { from: '2026-10-01', to: '2026-10-13' })).toBe(
      'FREEZE_TOO_SHORT',
    );
    expect(validateFreeze(enr, [], { from: '2026-10-01', to: '2026-10-14' })).toBeNull();
    expect(validateFreeze(enr, [], { from: '2026-08-20', to: '2026-09-20' })).toBe(
      'FREEZE_OUTSIDE_ENROLLMENT',
    );
    expect(
      validateFreeze(enr, [e('2026-10-10', '2026-10-30')], {
        from: '2026-10-01',
        to: '2026-10-20',
      }),
    ).toBe('FREEZE_OVERLAP');
  });
  it('daysInclusive va transferSplit', () => {
    expect(daysInclusive('2026-02-01', '2026-02-28')).toBe(28);
    expect(transferSplit('2026-03-01')).toEqual({ endOld: '2026-02-28', startNew: '2026-03-01' });
  });
});
