import type { CashDay } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const day: CashDay = {
  date: '2026-11-15',
  expectedCash: '1150000',
  payments: [
    {
      id: '0190a000-0000-7000-8000-0000000000c1',
      paidAt: '2026-11-15T05:00:00Z',
      student: 'Aliyev Jasur',
      amount: '650000',
      receiptNumber: 'LG-2026-000001',
    },
    {
      id: '0190a000-0000-7000-8000-0000000000c2',
      paidAt: '2026-11-15T06:00:00Z',
      student: 'Boboyev Sardor',
      amount: '500000',
      receiptNumber: 'LG-2026-000002',
    },
  ],
  closed: null,
};
const handler = (c: Call) => {
  if (c.path.startsWith('/billing/cash/day?date=')) return json(200, day);
  if (c.method === 'POST') return json(201, { id: 'x' });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-16 Kassa (T-209, FR-PAY-10)', () => {
  it('cash.close yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['billing.view'], handler);
    renderApp('/cash');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('FR-PAY-10: farq boʻlsa izoh majburiy; yopish — sanalgan summa va izoh bilan', async () => {
    const calls = fakeApi(['cash.close'], handler);
    renderApp('/cash');
    expect(await screen.findByText(/Aliyev Jasur/)).toBeTruthy();
    const user = userEvent.setup();
    await user.type(screen.getByLabelText(t.cash.counted), '1100000');
    const btn = screen.getByRole('button', { name: t.cash.close });
    expect(btn.hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText(t.cash.diffNote), 'Qaytim berildi');
    await user.click(btn);
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toEqual({
        method: 'POST',
        path: '/billing/cash/close',
        body: {
          date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          countedCash: '1100000',
          note: 'Qaytim berildi',
        },
      }),
    );
  });
});
