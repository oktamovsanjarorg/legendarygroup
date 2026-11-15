import type { MonthlyPnLSummary } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { lastPeriods, toPnlRow } from './pnl.js';

const pnl = (period: string): MonthlyPnLSummary => ({
  period,
  revenue: '10000000',
  expenses: '3200000',
  payroll: '4000000',
  totalCosts: '7200000',
  netProfit: '2800000',
  profitMarginBp: 2800,
  expensesByCategory: {},
  revenueByMethod: {},
});
const handler = (c: Call) =>
  c.path.startsWith('/finance/pnl?period=') ? json(200, pnl(c.path.slice(-7))) : undefined;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-24 P&L (T-403, FR-FIN-2/3)', () => {
  it('soʻnggi 6 oy (yil oʻtishi bilan); qatorlar — server summalari', () => {
    expect(lastPeriods('2026-02', 4)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(toPnlRow(pnl('2026-11'))).toMatchObject({
      totalExpenses: 7_200_000n,
      marginPercent: 28,
    });
  });

  it('FR-FIN-3: finance.view yoʻq (Admin) — ruxsat yoʻq', async () => {
    const calls = fakeApi(['expense.manage'], handler);
    renderApp('/pnl');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('6 oy soʻraladi va jadvalda koʻrinadi', async () => {
    const calls = fakeApi(['finance.view'], handler);
    renderApp('/pnl');
    expect(await screen.findByText(t.pnl.title)).toBeTruthy();
    await waitFor(() =>
      expect(calls.filter((c) => c.path.startsWith('/finance/pnl'))).toHaveLength(6),
    );
    expect((await screen.findAllByText(/2\s800\s000/)).length).toBeGreaterThan(0);
  });
});
