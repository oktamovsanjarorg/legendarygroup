import type { PaymentDetail, PaymentPreview, StudentListRow } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const SID = '0190a000-0000-7000-8000-0000000000e1';
const row: StudentListRow = {
  id: SID,
  code: 1041,
  fullName: 'Aliyeva Madina',
  birthDate: null,
  phone: null,
  archivedAt: null,
  groups: [{ id: 'g1', name: 'IELTS 7.0' }],
  frozen: false,
  guardian: null,
};
const preview = (amount: string): PaymentPreview =>
  amount === '0'
    ? { debt: '1300000', parts: [], advance: '0' }
    : {
        debt: '1300000',
        parts: [
          { period: '2026-10', amount: '650000', closes: true },
          { period: '2026-11', amount: '650000', closes: true },
        ],
        advance: '200000',
      };
const saved = { id: 'p1', receiptNumber: 'LG-2026-000513' } as PaymentDetail;

const handler = (c: Call) => {
  if (c.path.startsWith('/students?')) return json(200, { items: [row], nextCursor: null });
  if (c.path.startsWith('/billing/payments/preview'))
    return json(200, preview(new URLSearchParams(c.path.split('?')[1]).get('amount') ?? '0'));
  if (c.method === 'POST' && c.path === '/billing/payments') return json(201, saved);
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-13 Toʻlov kiritish (T-204, BR-11, BR-12)', () => {
  it('payment.create yoʻq — ruxsat yoʻq, API chaqirilmaydi', async () => {
    const calls = fakeApi(['billing.view'], handler);
    renderApp('/payments/new');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('BR-12/BR-11: qidiruv ↓Enter → server FIFO preview → saqlash Idempotency-Key bilan', async () => {
    const calls = fakeApi(['payment.create', 'billing.view'], handler);
    renderApp('/payments/new');
    const user = userEvent.setup();
    await user.type(await screen.findByRole('combobox'), 'ali');
    await screen.findByText('Aliyeva Madina');
    await user.keyboard('{Enter}');
    await user.type(screen.getByLabelText(t.payEntry.amount), '1500000');
    expect(await screen.findByText('oktabr, 2026')).toBeTruthy();
    expect(screen.getByText(/Avans \(balansga\)/)).toBeTruthy();
    await user.click(screen.getByRole('radio', { name: /Terminal/ }));
    await user.click(screen.getByRole('button', { name: t.payEntry.submit }));
    expect(await screen.findByText(/LG-2026-000513/)).toBeTruthy();
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.body).toEqual({ studentId: SID, amount: '1500000', method: 'card' });
    expect(post?.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('BR-11: keyingi toʻlov — yangi kalit; xato boʻlsa qayta yuborish — oʻsha kalit', async () => {
    let fail = true;
    const calls = fakeApi(['payment.create'], (c) => {
      if (c.method === 'POST' && fail) {
        fail = false;
        return json(503, { code: 'HTTP_ERROR', message: 'Tarmoq xatosi' });
      }
      return handler(c);
    });
    renderApp('/payments/new');
    const user = userEvent.setup();
    await user.type(await screen.findByRole('combobox'), 'ali');
    await user.click(await screen.findByText('Aliyeva Madina'));
    await user.type(screen.getByLabelText(t.payEntry.amount), '100000');
    await user.click(screen.getByRole('button', { name: t.payEntry.submit }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: t.payEntry.submit }));
    await screen.findByText(/LG-2026-000513/);
    await user.click(screen.getByRole('button', { name: t.payEntry.next }));
    await user.type(await screen.findByRole('combobox'), 'ali');
    await user.click(await screen.findByText('Aliyeva Madina'));
    await user.type(screen.getByLabelText(t.payEntry.amount), '200000');
    await user.click(screen.getByRole('button', { name: t.payEntry.submit }));
    await waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(3));
    const keys = calls.filter((c) => c.method === 'POST').map((c) => c.idempotencyKey);
    expect(keys[0]).toBe(keys[1]);
    expect(keys[2]).not.toBe(keys[0]);
  });
});
