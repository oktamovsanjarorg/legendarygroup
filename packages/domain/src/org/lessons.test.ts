import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays } from '../policies/index.js';
import {
  endOfMonth,
  holidayEffect,
  isoWeekday,
  lessonHorizon,
  lessonKey,
  planLessons,
  teacherOn,
} from './lessons.js';
import type { Slot } from './schedule.js';

const slot = (id: string, over: Partial<Slot> = {}): Slot => ({
  id,
  weekday: 1,
  startTime: '09:00:00',
  endTime: '10:30:00',
  validFrom: '2026-09-01',
  validTo: null,
  ...over,
});
const day = fc.integer({ min: 0, max: 800 }).map((n) => addDays('2026-01-01', n));

describe('kalendar yordamchilari', () => {
  it('endOfMonth: kabisa yili va dekabr', () => {
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(endOfMonth('2026-02-01')).toBe('2026-02-28');
    expect(endOfMonth('2026-12-31')).toBe('2026-12-31');
  });
  it('isoWeekday: 2026-11-16 — dushanba, 2026-11-22 — yakshanba', () => {
    expect(isoWeekday('2026-11-16')).toBe(1);
    expect(isoWeekday('2026-11-22')).toBe(7);
  });
});

describe('lessonHorizon (FR-ORG-5, Q-73)', () => {
  it('oy boshida — keyingi oy oxiri; oy oxirida — 4 hafta ham keyingi oy oxiridan oshmaydi', () => {
    expect(lessonHorizon('2026-11-01')).toBe('2026-12-31');
    expect(lessonHorizon('2026-01-31')).toBe('2026-02-28');
  });
  it('property: ≥ 28 kun va ≥ keyingi oy oxiri', () => {
    fc.assert(
      fc.property(day, (today) => {
        const h = lessonHorizon(today);
        expect(h >= addDays(today, 28)).toBe(true);
        expect(h >= endOfMonth(addDays(endOfMonth(today), 1))).toBe(true);
      }),
    );
  });
});

describe('planLessons (BR-3: bayram generatsiya qilinmaydi)', () => {
  const range = { from: '2026-11-01', to: '2026-11-30' };
  it('dushanbalar, bayram tashlab ketiladi, slot davri hisobga olinadi', () => {
    const lessons = planLessons(
      [slot('a'), slot('b', { weekday: 3, validTo: '2026-11-11', startTime: '14:00:00' })],
      range,
      new Set(['2026-11-16']),
    );
    expect(lessons.map(lessonKey)).toEqual([
      '2026-11-02 09:00',
      '2026-11-04 14:00',
      '2026-11-09 09:00',
      '2026-11-11 14:00',
      '2026-11-23 09:00',
      '2026-11-30 09:00',
    ]);
    expect(lessons[0]).toEqual({
      slotId: 'a',
      date: '2026-11-02',
      startTime: '09:00',
      endTime: '10:30',
    });
  });
  it('property: har dars oraliq ichida, hafta kuni mos, bayram emas, takror yoʻq', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 7 }),
        day,
        fc.integer({ min: 0, max: 90 }),
        fc.array(day, { maxLength: 10 }),
        (weekday, from, len, hs) => {
          const to = addDays(from, len);
          const holidays = new Set(hs);
          const out = planLessons(
            [slot('s', { weekday, validFrom: '2025-01-01' })],
            { from, to },
            holidays,
          );
          for (const l of out) {
            expect(l.date >= from && l.date <= to).toBe(true);
            expect(isoWeekday(l.date)).toBe(weekday);
            expect(holidays.has(l.date)).toBe(false);
          }
          expect(new Set(out.map(lessonKey)).size).toBe(out.length);
          const expected = Array.from({ length: len + 1 }, (_, i) => addDays(from, i)).filter(
            (d) => isoWeekday(d) === weekday && !holidays.has(d),
          );
          expect(out.map((l) => l.date)).toEqual(expected);
        },
      ),
    );
  });
});

describe('teacherOn va holidayEffect', () => {
  it('sanadagi asosiy ustoz; yoʻq boʻlsa null', () => {
    const main = [
      { teacherId: 't1', from: '2026-09-01', to: '2026-10-31' },
      { teacherId: 't2', from: '2026-11-01', to: null },
    ];
    expect(teacherOn(main, '2026-10-31')).toBe('t1');
    expect(teacherOn(main, '2026-11-01')).toBe('t2');
    expect(teacherOn(main, '2026-08-31')).toBeNull();
  });
  it('Q-71: joriy oy — bekor (kredit), keyingi oy — oʻchiriladi', () => {
    expect(holidayEffect('2026-11-30', '2026-11-12')).toBe('cancel');
    expect(holidayEffect('2026-11-01', '2026-11-12')).toBe('cancel');
    expect(holidayEffect('2026-12-01', '2026-11-12')).toBe('delete');
  });
});
