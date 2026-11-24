import type { DebtorItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const SID = '0190a000-0000-7000-8000-0000000000e1';
const item: DebtorItem = {
  id: SID,
  name: 'Aliyev Jasur',
  code: 'LG-10001',
  group: 'IELTS',
  debt: '1300000',
  overdueDays: 16,
  lastPayment: null,
  reminders: 2,
  critical: true,
  guardian: null,
  canRemind: false,
  remindedToday: false,
};
const handler = (c: Call) => {
  if (c.path.startsWith('/billing/debtors?'))
    return json(200, { items: [item], totalDebt: '1300000', nextCursor: null });
  if (c.method === 'POST') return json(201, { success: true, reminderCount: 3, sentAt: 'x' });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-15 Qarzdorlar (T-208, FR-PAY-7, BR-22)', () => {
  it('ota-ona (billing.view, payment.review yoʻq) — ruxsat yoʻq', async () => {
    const calls = fakeApi(['billing.view'], handler);
    renderApp('/debtors');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('BR-22: kritik belgi, jami server summasi; aging tab — soʻrovda; eslatma — POST', async () => {
    const calls = fakeApi(['billing.view', 'payment.review'], handler);
    renderApp('/debtors');
    const tr = (await screen.findByText('Aliyev Jasur')).closest('tr') as HTMLElement;
    expect(within(tr).getByText(t.debtors.critical)).toBeTruthy();
    expect(screen.getByText(/Jami qarz: 1\s300\s000/)).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: t.debtors.buckets.d8_30 }));
    await waitFor(() => expect(calls.some((c) => c.path.includes('bucket=d8_30'))).toBe(true));
    const row = (await screen.findByText('Aliyev Jasur')).closest('tr') as HTMLElement;
    await user.click(within(row).getByRole('button', { name: t.debtors.remindNow }));
    await waitFor(() =>
      expect(
        calls.some((c) => c.method === 'POST' && c.path === `/billing/debtors/${SID}/remind`),
      ).toBe(true),
    );
  });
});
