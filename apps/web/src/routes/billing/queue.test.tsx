import type { PaymentSubmission } from '@lg/contracts';
import { miniappMessages as m, webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const sub = (id: string, over: Partial<PaymentSubmission> = {}): PaymentSubmission => ({
  id,
  branchId: 'b',
  studentId: 's',
  studentName: `Oʻquvchi ${id.slice(-1)}`,
  groupName: 'IELTS',
  guardianId: 'g',
  guardianName: 'Ona',
  amountClaimed: '650000',
  comment: null,
  fileId: null,
  fileUrl: 'https://s3/chek.png',
  status: 'pending_review',
  reviewLockedBy: null,
  reviewLockedUntil: null,
  reviewedBy: null,
  reviewedAt: null,
  rejectReason: null,
  paymentId: null,
  createdAt: '2026-11-12T05:00:00Z',
  updatedAt: '2026-11-12T05:00:00Z',
  ...over,
});
const A = '0190a000-0000-7000-8000-0000000000a1';
const B = '0190a000-0000-7000-8000-0000000000a2';
const handler = (c: Call) => {
  if (c.path === '/billing/submissions?status=pending_review')
    return json(200, [
      sub(B, { createdAt: '2026-11-12T06:00:00Z' }),
      sub(A, { duplicateWarning: 'Oʻxshash chek bor', overdue: true }),
    ]);
  if (c.method === 'POST') return json(201, { success: true });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-14 Chek navbati (T-207, FR-PAY-4/5, BR-13)', () => {
  it('payment.review yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['billing.view'], handler);
    renderApp('/payments/queue');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('FR-PAY-4: eng eskisi birinchi, dublikat ogohlantirishi; tahrirlangan summa bilan tasdiq — qulf, keyin confirm', async () => {
    const calls = fakeApi(['payment.review'], handler);
    renderApp('/payments/queue');
    expect(await screen.findByText('Oʻxshash chek bor')).toBeTruthy();
    expect(screen.getByText(t.queueWeb.overdue)).toBeTruthy();
    const user = userEvent.setup();
    const field = screen.getByLabelText(m.review.amount);
    await user.clear(field);
    await user.type(field, '600000');
    await user.click(screen.getByRole('button', { name: m.review.approve }));
    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'POST')).toEqual([
        { method: 'POST', path: `/billing/submissions/${A}/lock`, body: undefined },
        { method: 'POST', path: `/billing/submissions/${A}/confirm`, body: { amount: '600000' } },
      ]),
    );
  });

  it('BR-13: rad etish — sabab tanlanmaguncha tugma oʻchiq', async () => {
    const calls = fakeApi(['payment.review'], handler);
    renderApp('/payments/queue');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: m.review.reject }));
    const confirm = screen.getAllByRole('button', { name: m.review.reject }).at(-1)!;
    expect(confirm.hasAttribute('disabled')).toBe(true);
    await user.click(screen.getByRole('button', { name: m.review.reasons.notReceived }));
    await user.click(confirm);
    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'POST').at(-1)).toEqual({
        method: 'POST',
        path: `/billing/submissions/${A}/reject`,
        body: { reason: m.review.reasons.notReceived },
      }),
    );
  });
});
