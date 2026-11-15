import type { PublicCourse } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const L = t.landing;
const course: PublicCourse = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Haqiqiy kurs',
  description: null,
  defaultMonthlyPrice: '450000',
  lessonDurationMin: 90,
  durationMonths: null,
};
const center = { name: 'LG', phone: '+998712000000', address: 'Chilonzor 1', logoFileId: null };

const handler = (leadStatus: number) => (c: Call) => {
  if (c.path === '/public/courses') return json(200, [course]);
  if (c.path === '/settings/public')
    return json(200, {
      centerInfo: center,
      paymentCards: [],
      billingDueDay: 10,
      botUrl: 'https://t.me/x',
    });
  if (c.path === '/public/leads') return json(leadStatus, { accepted: true });
  return undefined;
};

const fill = () => {
  fireEvent.change(screen.getByLabelText(L.form.nameLabel), { target: { value: 'Ali Valiyev' } });
  fireEvent.change(screen.getByLabelText(L.form.phoneLabel), {
    target: { value: '+998 90 123 45 67' },
  });
  fireEvent.click(screen.getByRole('button', { name: L.form.submit }));
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-35 landing (T-503, FR-SYS-4)', () => {
  it('kurslar va kontaktlar — API’dan (uydirma statistika va manzil yoʻq)', async () => {
    fakeApi([], handler(202));
    renderApp('/landing');
    expect((await screen.findAllByText('Haqiqiy kurs')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Chilonzor 1')).toBeTruthy();
    expect(screen.queryByText('1 200+')).toBeNull();
  });

  it('bug: ariza obyekt sifatida, courseId bilan yuboriladi; 202 — muvaffaqiyat', async () => {
    const calls = fakeApi([], handler(202));
    renderApp('/landing');
    await screen.findAllByText('Haqiqiy kurs');
    fill();
    expect(await screen.findByText(L.form.successTitle)).toBeTruthy();
    const lead = calls.find((c) => c.path === '/public/leads');
    expect(lead?.body).toEqual({
      fullName: 'Ali Valiyev',
      phone: '+998 90 123 45 67',
      courseId: course.id,
      comment: null,
    });
  });

  it('bug: server rad etsa — "qabul qilindi" koʻrsatilmaydi, xato chiqadi', async () => {
    fakeApi([], handler(400));
    renderApp('/landing');
    await screen.findAllByText('Haqiqiy kurs');
    fill();
    expect(await screen.findByText(L.form.error)).toBeTruthy();
    expect(screen.queryByText(L.form.successTitle)).toBeNull();
  });
});
