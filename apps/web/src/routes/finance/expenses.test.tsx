import type { ExpenseItem, MonthlyPnLSummary } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { toKpi } from './expenses.js';
import { monthBounds, prevPeriod } from './period.js';

const pnl = (expenses: string, byCat: Record<string, string>): MonthlyPnLSummary => ({
  period: '2026-11',
  revenue: '0',
  expenses,
  payroll: '0',
  payrollPending: false,
  totalCosts: expenses,
  netProfit: '0',
  profitMarginBp: 0,
  expensesByCategory: byCat,
  revenueByMethod: {},
});
const item = {
  id: '0190a000-0000-7000-8000-0000000000e5',
  category: 'rent',
  amount: '8000000',
  date: '2026-11-01',
  note: 'Ijara',
  fileId: null,
  createdBy: 'u1',
  createdByName: 'Bosh Direktor',
} as ExpenseItem;
const handler = (c: Call) => {
  if (c.path.startsWith('/expenses?')) return json(200, [item]);
  if (c.path.startsWith('/finance/pnl')) return json(200, pnl('8000000', { rent: '8000000' }));
  if (c.method === 'POST') return json(201, item);
  return undefined;
};
const f = t.expenses.form;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-23 Xarajatlar (T-403, FR-FIN-1)', () => {
  it('davr yordamchilari va KPI — server summalaridan', () => {
    expect(prevPeriod('2026-01')).toBe('2025-12');
    expect(monthBounds('2026-02')).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    const k = toKpi(pnl('900', { rent: '600', other: '300' }), pnl('1000', {}));
    expect(k).toEqual({ total: 900n, topCategory: 'rent', delta: -100n });
    expect(toKpi(undefined, undefined).topCategory).toBeNull();
  });

  it('expense.manage yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['billing.view'], handler);
    renderApp('/expenses');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('FR-FIN-1: roʻyxatda kiritgan xodim ismi; yangi xarajat — POST (summa string)', async () => {
    const calls = fakeApi(['expense.manage', 'finance.view'], handler);
    renderApp('/expenses');
    expect(await screen.findByText('Bosh Direktor')).toBeTruthy();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: t.expenses.new }));
    await user.click(screen.getByRole('button', { name: f.submit }));
    expect(screen.getByText(f.amountRequired)).toBeTruthy();
    await user.type(screen.getByLabelText(f.amountLabel), '450000');
    await user.type(screen.getByLabelText(f.descLabel), 'Elektr');
    await user.selectOptions(screen.getByLabelText(f.categoryLabel), 'utilities');
    await user.click(screen.getByRole('button', { name: f.submit }));
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'POST')?.body).toEqual({
        category: 'utilities',
        amount: '450000',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        note: 'Elektr',
      }),
    );
  });
});
