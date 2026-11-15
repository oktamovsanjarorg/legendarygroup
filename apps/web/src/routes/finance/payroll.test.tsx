import type { PayrollRunDetail } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';

const RUN = '0190a000-0000-7000-8000-0000000000aa';
const run = {
  id: RUN,
  period: '2026-11',
  status: 'draft',
  totalAmount: '4150000',
  teachers: [
    {
      teacherId: 't1',
      teacherName: 'Aziz Rahimov',
      totalNet: '4150000',
      earned: '5150000',
      extras: '0',
      advances: '1000000',
      items: [{ kind: 'advance', amount: '-1000000', note: 'Avans ushlab qolindi' }],
    },
  ],
} as unknown as PayrollRunDetail;
const handler = (data: PayrollRunDetail | null) => (c: Call) => {
  if (c.path.startsWith('/payroll/runs?period=')) return json(200, data);
  if (c.method === 'POST') return json(201, run);
  return undefined;
};
const p = t.payroll;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-25 Oyliklar (T-402, FR-SAL-2, BR-27)', () => {
  it('payroll.manage yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['finance.view'], handler(run));
    renderApp('/payroll');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('hisoblanmagan oy — "Hisoblash" generatsiya qiladi (GET yozmaydi)', async () => {
    const calls = fakeApi(['payroll.manage'], handler(null));
    renderApp('/payroll');
    expect(await screen.findByText(p.notGenerated)).toBeTruthy();
    expect(calls.every((c) => c.method === 'GET')).toBe(true);
    await userEvent.setup().click(screen.getByRole('button', { name: p.actions.generate }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')).toEqual({
        method: 'POST',
        path: '/payroll/runs/generate',
        body: { period: expect.stringMatching(/^\d{4}-\d{2}$/) },
      }),
    );
  });

  it('BR-27: qoralama — server yigʻindilari; tasdiq faqat approval.decide bilan', async () => {
    fakeApi(['payroll.manage'], handler(run));
    renderApp('/payroll');
    expect(await screen.findByText('Aziz Rahimov')).toBeTruthy();
    expect(screen.getByText(/−1\s000\s000/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: p.approveAll })).toBeNull();
    cleanup();
    const calls = fakeApi(['payroll.manage', 'approval.decide'], handler(run));
    renderApp('/payroll');
    await userEvent.setup().click(await screen.findByRole('button', { name: p.approveAll }));
    await waitFor(() =>
      expect(calls.some((c) => c.path === `/payroll/runs/${RUN}/approve`)).toBe(true),
    );
  });
});
