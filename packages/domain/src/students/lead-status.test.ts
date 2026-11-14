import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  canChangeLeadStatus,
  canConvertLead,
  conversionPercent,
  LEAD_STATUS_FLOW,
  type LeadStatusCode,
} from './lead-status.js';

const ALL = Object.keys(LEAD_STATUS_FLOW) as LeadStatusCode[];

describe('Lid holatlari (FR-STU-4)', () => {
  it('won — faqat aylantirish orqali; won — oxirgi holat; lost → new (qayta ochish)', () => {
    for (const s of ALL) expect(canChangeLeadStatus(s, 'won')).toBe(false);
    for (const s of ALL) expect(canChangeLeadStatus('won', s)).toBe(false);
    expect(canChangeLeadStatus('lost', 'new')).toBe(true);
    expect(canChangeLeadStatus('new', 'trial')).toBe(true);
    expect(canChangeLeadStatus('trial', 'new')).toBe(false);
  });
  it('aylantirish — faqat ochiq liddan', () => {
    expect(ALL.filter(canConvertLead).sort()).toEqual(['contacted', 'new', 'trial']);
  });
  it('konversiya: 0 ga boʻlinmaydi, 0–100 oraligʻida, bir xona', () => {
    expect(conversionPercent({ total: 0, won: 0 })).toBe(0);
    expect(conversionPercent({ total: 3, won: 1 })).toBe(33.3);
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }),
        fc.integer({ min: 0, max: 10_000 }),
        (t, w) => {
          const p = conversionPercent({ total: t, won: Math.min(w, t) });
          expect(p >= 0 && p <= 100).toBe(true);
          expect(Math.round(p * 10)).toBe(p * 10);
        },
      ),
    );
  });
});
