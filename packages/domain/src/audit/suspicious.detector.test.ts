import { describe, expect, it } from 'vitest';
import {
  evaluateActionSuspicion,
  formatResponseTime,
  isNightActivity,
} from './suspicious.detector.js';

describe('Suspicious Detector & Staff Activity (FR-AUD-2, FR-AUD-3)', () => {
  it('shubhali amallarni toʻgʻri aniqlaydi', () => {
    const rev = evaluateActionSuspicion('payment.reverse');
    expect(rev.suspicious).toBe(true);
    expect(rev.riskLevel).toBe('high');

    const disc = evaluateActionSuspicion('discount.grant');
    expect(disc.suspicious).toBe(true);
    expect(disc.riskLevel).toBe('medium');

    const att = evaluateActionSuspicion('attendance.edit_past');
    expect(att.suspicious).toBe(true);
    expect(att.riskLevel).toBe('medium');

    const normal = evaluateActionSuspicion('course.create');
    expect(normal.suspicious).toBe(false);
  });

  it('tunda bajarilgan amallarni aniqlaydi (UTC+5 boʻyicha 23:00 - 06:00)', () => {
    // 2026-11-10 18:30:00 UTC = 23:30 Tashkent (tun)
    const nightDate = new Date('2026-11-10T18:30:00Z');
    expect(isNightActivity(nightDate)).toBe(true);

    // 2026-11-10 00:30:00 UTC = 05:30 Tashkent (tun)
    const earlyMorning = new Date('2026-11-10T00:30:00Z');
    expect(isNightActivity(earlyMorning)).toBe(true);

    // 2026-11-10 09:00:00 UTC = 14:00 Tashkent (kunduzi)
    const dayDate = new Date('2026-11-10T09:00:00Z');
    expect(isNightActivity(dayDate)).toBe(false);
  });

  it('oʻrtacha javob berish vaqtini formatlaydi', () => {
    expect(formatResponseTime(null)).toBe('—');
    expect(formatResponseTime(0.5)).toBe('1 daqiqadan kam');
    expect(formatResponseTime(15)).toBe('15 daq');
    expect(formatResponseTime(90)).toBe('1.5 soat');
    expect(formatResponseTime(150)).toBe('2.5 soat');
  });
});
