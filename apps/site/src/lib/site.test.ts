import type { PublicCourse } from '@lg/contracts';
import { siteMessages as s } from '@lg/i18n';
import { describe, expect, it } from 'vitest';
import { checkLead, toCourseCard } from './site.js';
import { SITE_TEXTS as T } from './texts.js';

const course: PublicCourse = {
  id: '0193a000-0000-7000-8000-000000000001',
  name: 'Ingliz tili (IELTS)',
  description: 'B1 → 7.0',
  defaultMonthlyPrice: '650000',
  lessonDurationMin: 90,
  durationMonths: 8,
};

describe('toCourseCard (T-503)', () => {
  it('narx bigint so‘mda guruhlanadi, davomiylik va dars vaqti', () => {
    const c = toCourseCard(course, T);
    expect(c.price).toBe('650 000 soʻm');
    expect(c.meta).toEqual(['Davomiyligi: 8 oy', 'Dars: 90 daqiqa']);
  });

  it('davomiylik yo‘q bo‘lsa faqat dars vaqti', () => {
    expect(toCourseCard({ ...course, durationMonths: null }, T).meta).toEqual(['Dars: 90 daqiqa']);
  });
});

describe('checkLead (PublicLeadRequest)', () => {
  const base = {
    fullName: ' Ali Valiyev ',
    phone: '90 123 45 67',
    courseId: '',
    comment: '',
    website: '',
  };

  it('telefon E.164 ga, bo‘sh maydonlar null', () => {
    expect(checkLead(base, T)).toEqual({
      ok: true,
      body: { fullName: 'Ali Valiyev', phone: '+998901234567', courseId: null, comment: null },
    });
  });

  it('noto‘g‘ri telefon va bo‘sh ism — maydon bilan xato', () => {
    expect(checkLead({ ...base, phone: '123' }, T)).toEqual({
      ok: false,
      field: 'phone',
      error: s.phoneInvalid,
    });
    expect(checkLead({ ...base, fullName: ' ' }, T)).toEqual({
      ok: false,
      field: 'fullName',
      error: s.nameRequired,
    });
  });

  it('honeypot to‘ldirilsa serverga uzatiladi (server rad etadi)', () => {
    const r = checkLead({ ...base, website: 'spam.example' }, T);
    expect(r.ok && r.body['website']).toBe('spam.example');
  });
});
