import type { ApprovalRequest } from '@lg/contracts';
import { miniappMessages as m, webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const AID = '0190a000-0000-7000-8000-0000000000b1';
const req = {
  id: AID,
  type: 'refund',
  payload: { studentId: 's', amount: '100000', method: 'cash', reason: 'Ketdi' },
  reason: 'Oʻqishni toʻxtatdi',
  requestedBy: 'u2',
  requestedByName: 'Admin Ali',
  status: 'pending',
  expiresAt: '2026-11-16T05:00:00Z',
} as unknown as ApprovalRequest;
const handler = (c: Call) => {
  if (c.path === '/approvals?status=pending') return json(200, [req]);
  if (c.method === 'POST') return json(201, { status: 'approved' });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-31 Tasdiqlash soʻrovlari (T-119, 02 §5)', () => {
  it('approval.decide yoʻq (Admin) — ruxsat yoʻq', async () => {
    const calls = fakeApi(['payment.review'], handler);
    renderApp('/approvals');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('BR-17: refund soʻrovi — summa koʻrinadi; tasdiqlash — decide approve', async () => {
    const calls = fakeApi(['approval.decide', 'payment.review'], handler);
    renderApp('/approvals');
    const user = userEvent.setup();
    await user.click(await screen.findByText('Admin Ali'));
    expect(screen.getByText(/100\s000/)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: m.approvals.approve }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toEqual({
        method: 'POST',
        path: `/approvals/${AID}/decide`,
        body: { decision: 'approve' },
      }),
    );
  });
});
