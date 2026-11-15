import { DEFAULT_SYSTEM_SETTINGS, type SystemSettings } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, noContent, renderApp } from '../../test/app.js';
import { toForm, toPatch } from './settings-map.js';

const CARD = '0190a000-0000-7000-8000-0000000000c1';
const cur = {
  ...DEFAULT_SYSTEM_SETTINGS,
  penaltyConfig: { ...DEFAULT_SYSTEM_SETTINGS.penaltyConfig, penaltyPerLesson: '0' },
  paymentCards: [
    {
      id: CARD,
      cardNumber: '8600123412341234',
      holderName: 'LG',
      bankName: 'Kapital',
      isPrimary: true,
    },
  ],
} as unknown as SystemSettings;
const handler = (c: Call) => {
  if (c.path === '/settings' && c.method === 'GET') return json(200, cur);
  if (c.path === '/settings') return json(200, cur);
  if (c.path.startsWith('/holidays?'))
    return json(200, [{ date: '2026-12-31', name: 'Yangi yil' }]);
  if (c.method === 'POST') return json(201, {});
  if (c.method === 'DELETE') return noContent();
  return undefined;
};
const s = t.settings;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-29 Sozlamalar (T-115, FR-SYS-1)', () => {
  it('BR-18: toʻlov boʻlimi PATCH — faqat shu boʻlim; asosiy karta almashtiriladi (id saqlanadi)', () => {
    const f = { ...toForm(cur), card: '8600 9999 8888 7777', adminDiscountLimit: 15 };
    expect(toPatch('billing', f, cur, () => 'new')).toEqual({
      billingDueDay: 10,
      adminDiscountLimitPercent: 15,
      paymentCards: [
        {
          id: CARD,
          cardNumber: '8600999988887777',
          holderName: 'LG',
          bankName: 'Kapital',
          isPrimary: true,
        },
      ],
    });
    expect(toPatch('holidays', f, cur, () => 'x')).toBeNull();
  });

  it('settings.manage yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['billing.view'], handler);
    renderApp('/settings');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('markaz nomini saqlash — PATCH centerInfo; bayram qoʻshish va oʻchirish', async () => {
    const calls = fakeApi(['settings.manage'], handler);
    renderApp('/settings');
    const user = userEvent.setup();
    const name = await screen.findByLabelText(s.centerName);
    await user.clear(name);
    await user.type(name, 'Legendary Group Chilonzor');
    await user.click(screen.getByRole('button', { name: t.common.save }));
    expect(await screen.findByText(s.saved)).toBeTruthy();
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({
      centerInfo: {
        name: 'Legendary Group Chilonzor',
        phone: cur.centerInfo.phone,
        address: cur.centerInfo.address,
      },
    });
    await user.click(screen.getByRole('tab', { name: s.sections.holidays }));
    expect(await screen.findByText(/Yangi yil/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: s.holidayRemove }));
    await waitFor(() =>
      expect(calls.some((c) => c.method === 'DELETE' && c.path === '/holidays/2026-12-31')).toBe(
        true,
      ),
    );
  });
});
