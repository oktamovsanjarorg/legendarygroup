import type { PaymentView } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const PID = '0190a000-0000-7000-8000-0000000000f1';
const SID = '0190a000-0000-7000-8000-0000000000e1';
const view = (over: Partial<PaymentView> = {}): PaymentView => ({
  id: PID,
  studentId: SID,
  studentName: 'Aliyeva Madina',
  amount: '650000',
  method: 'card',
  paidAt: '2026-11-12T05:00:00Z',
  receiptNumber: 'LG-2026-000513',
  verifyUrl: 'https://app.lg.uz/verify/abc',
  createdBy: 'Admin Ali',
  viaSubmission: false,
  allocations: [{ period: '2026-11', amount: '650000' }],
  reversed: null,
  canReverseNow: true,
  ...over,
});
const d = t.payDetail;
const handler = (v: PaymentView) => (c: Call) => {
  if (c.path === `/billing/payments/${PID}/view`) return json(200, v);
  if (c.method === 'POST') return json(201, { id: 'x' });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-17 Toʻlov tafsiloti (T-205, BR-16, BR-17)', () => {
  it('billing.view yoʻq — ruxsat yoʻq, API chaqirilmaydi', async () => {
    const calls = fakeApi(['student.view'], handler(view()));
    renderApp(`/payments/${PID}`);
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('BR-16: bugungi toʻlov — storno toʻgʻridan; sabab majburiy', async () => {
    const calls = fakeApi(['billing.view', 'payment.reverse', 'payment.review'], handler(view()));
    renderApp(`/payments/${PID}`);
    expect(await screen.findByText('noyabr, 2026')).toBeTruthy();
    expect(screen.getByText('Kiritdi: Admin Ali')).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: d.reverse }));
    await user.click(screen.getByRole('button', { name: d.confirm }));
    expect(screen.getByText(d.reasonShort)).toBeTruthy();
    await user.type(screen.getByLabelText(d.reason), 'Kassa xatosi');
    await user.click(screen.getByRole('button', { name: d.confirm }));
    await screen.findByText(d.done);
    expect(calls.find((c) => c.method === 'POST')).toEqual({
      method: 'POST',
      path: `/billing/payments/${PID}/reverse`,
      body: { reason: 'Kassa xatosi' },
    });
  });

  it('BR-16/BR-17: kechagi toʻlov va refund huquqisiz — Direktorga soʻrov (T-119 payload)', async () => {
    const calls = fakeApi(
      ['billing.view', 'payment.reverse', 'payment.review'],
      handler(view({ canReverseNow: false })),
    );
    renderApp(`/payments/${PID}`);
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: d.refund }));
    await user.type(screen.getByLabelText(d.refundAmount), '100000');
    await user.type(screen.getByLabelText(d.reason), 'Oʻqishni toʻxtatdi');
    await user.click(screen.getByRole('button', { name: d.sendRequest }));
    await screen.findByText(d.requestSent);
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toEqual({
        method: 'POST',
        path: '/approvals',
        body: {
          type: 'refund',
          payload: {
            studentId: SID,
            amount: '100000',
            method: 'cash',
            reason: 'Oʻqishni toʻxtatdi',
          },
          reason: 'Oʻqishni toʻxtatdi',
        },
      }),
    );
  });

  it('bekor qilingan toʻlov — sabab koʻrinadi, amallar yoʻq', async () => {
    fakeApi(
      ['billing.view', 'payment.reverse'],
      handler(view({ reversed: { reason: 'Xato', at: '2026-11-12T06:00:00Z' } })),
    );
    renderApp(`/payments/${PID}`);
    expect(await screen.findByText(/Bekor qilingan \(storno\): Xato/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: d.reverse })).toBeNull();
  });
});
