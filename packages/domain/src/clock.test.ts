import { describe, expect, it } from 'vitest';
import { FixedClock, SystemClock, formatDateToYmd } from './clock.js';

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
