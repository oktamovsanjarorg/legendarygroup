import { describe, expect, it } from 'vitest';
import {
  FixedClock,
  SystemClock,
  formatDateToYmd,
  tashkentDayRange,
  tashkentInstant,
  tashkentMonthRange,
} from './clock.js';

describe("Clock servisi (CLAUDE.md 'Vaqt', 03 §2)", () => {
  it('formatDateToYmd sana formatini toʻgʻri qaytaradi', () => {
    // 2026-11-10T23:30:00Z UTC -> Toshkentda 2026-11-11 04:30
    const d = new Date('2026-11-10T23:30:00.000Z');
    expect(formatDateToYmd(d, 'Asia/Tashkent')).toBe('2026-11-11');
    expect(formatDateToYmd(d, 'UTC')).toBe('2026-11-10');
  });

  it('SystemClock hozirgi vaqtni qaytaradi', () => {
    const clock = new SystemClock();
    const before = Date.now();
    const now = clock.now();
    const after = Date.now();

    expect(now.getTime()).toBeGreaterThanOrEqual(before);
    expect(now.getTime()).toBeLessThanOrEqual(after);
    expect(clock.nowMs()).toBeGreaterThanOrEqual(before);
    expect(typeof clock.today()).toBe('string');
  });

  it('FixedClock vaqtni muzlatadi, siljitadi va qayta sozlaydi', () => {
    const initialIso = '2026-11-11T12:00:00.000Z';
    const clock = new FixedClock(initialIso);

    expect(clock.now().toISOString()).toBe(initialIso);
    expect(clock.nowMs()).toBe(new Date(initialIso).getTime());
    expect(clock.today('UTC')).toBe('2026-11-11');

    clock.advance(3600 * 1000); // 1 soat oldinga
    expect(clock.now().toISOString()).toBe('2026-11-11T13:00:00.000Z');

    clock.setNow('2027-01-01T00:00:00.000Z');
    expect(clock.today('UTC')).toBe('2027-01-01');
  });
});

describe('Toshkent kun/oy chegaralari', () => {
  it('kun 00:00 Toshkent = oldingi kun 19:00 UTC; oxiri istisno', () => {
    const r = tashkentDayRange('2026-11-14');
    expect(r.start.toISOString()).toBe('2026-11-13T19:00:00.000Z');
    expect(r.end.toISOString()).toBe('2026-11-14T19:00:00.000Z');
    // 02:00 Toshkentdagi to'lov — 14-noyabrga tegishli (UTC bo'yicha hali 13-noyabr)
    const pay = tashkentInstant('2026-11-14', '02:00');
    expect(pay >= r.start && pay < r.end).toBe(true);
    expect(formatDateToYmd(pay)).toBe('2026-11-14');
  });
  it('oy: dekabr → keyingi yil yanvari', () => {
    const r = tashkentMonthRange('2026-12');
    expect([r.start.toISOString(), r.end.toISOString()]).toEqual([
      '2026-11-30T19:00:00.000Z',
      '2026-12-31T19:00:00.000Z',
    ]);
  });
  it('soat:daqiqa:soniya qabul qilinadi', () => {
    expect(tashkentInstant('2026-11-14', '14:00:00').toISOString()).toBe(
      '2026-11-14T09:00:00.000Z',
    );
  });
});
