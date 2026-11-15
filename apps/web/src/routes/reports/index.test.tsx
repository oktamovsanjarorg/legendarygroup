import type {
  AttendanceReportResponse,
  DebtAgingResponse,
  LeadsConversionReportResponse,
  RevenueReportResponse,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { toAgingRows, toAttendanceRows } from './map.js';

const revenue: RevenueReportResponse = {
  items: [
    { id: '2026-11', name: '2026-11', totalRevenue: '4500000', paymentCount: 9, studentCount: 7 },
  ],
  totalRevenue: '4500000',
  totalPayments: 9,
};
const bucket = (n: number, d: string) => ({ studentCount: n, totalDebt: d });
const aging: DebtAgingResponse = {
  buckets: { fresh: bucket(2, '800000'), overdue: bucket(1, '400000'), critical: bucket(0, '0') },
  totalDebt: '1200000',
  totalDebtors: 3,
  debtors: [],
};
const attendance: AttendanceReportResponse = {
  items: [
    {
      id: 'g1',
      name: 'EN-1',
      totalLessons: 8,
      presentCount: 60,
      absentCount: 6,
      excusedCount: 2,
      lateCount: 4,
      attendancePercentBp: 8889,
    },
  ],
  overallAttendancePercentBp: 8889,
};
const leads: LeadsConversionReportResponse = {
  bySource: [
    {
      source: 'instagram',
      totalLeads: 10,
      contactedCount: 8,
      trialCount: 5,
      wonCount: 4,
      conversionPercentBp: 4000,
    },
  ],
  totalLeads: 10,
  totalWon: 4,
  overallConversionPercentBp: 4000,
};

const handler = (c: Call) => {
  if (c.path.startsWith('/reports/revenue')) return json(200, revenue);
  if (c.path === '/reports/debt-aging') return json(200, aging);
  if (c.path === '/reports/attendance') return json(200, attendance);
  if (c.path === '/reports/leads') return json(200, leads);
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-26 hisobotlar (T-501, FR-DASH-2/4)', () => {
  it('xaritalash: kechikkan — kelgan, foiz bazis punktdan; aging — 3 boʻlak', () => {
    expect(toAttendanceRows(attendance)[0]).toMatchObject({ present: 64, percent: 88.89 });
    expect(toAgingRows(aging).map((r) => [r.bucket, r.debt])).toEqual([
      ['fresh', 800_000n],
      ['overdue', 400_000n],
      ['critical', 0n],
    ]);
  });

  it('forbidden: stats.operational yoʻq — ruxsat yoʻq, soʻrov ketmaydi', async () => {
    const calls = fakeApi(['finance.view'], handler);
    renderApp('/reports');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('FR-FIN-3: finance.view yoʻq — moliya tablari va KPI soʻralmaydi', async () => {
    const calls = fakeApi(['stats.operational'], handler);
    renderApp('/reports');
    expect(await screen.findByText('EN-1')).toBeTruthy();
    expect(screen.queryByRole('tab', { name: t.reports.tabs.revenue })).toBeNull();
    expect(calls.some((c) => /revenue|debt-aging/.test(c.path))).toBe(false);
  });

  it('KPI — server qiymatlari; tab almashganda faqat shu hisobot soʻraladi', async () => {
    const calls = fakeApi(['stats.operational', 'finance.view'], handler);
    renderApp('/reports');
    expect((await screen.findAllByText(/4\s500\s000/)).length).toBeGreaterThan(0);
    expect(await screen.findByText('3')).toBeTruthy();
    expect(screen.getAllByText('40%').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: t.reports.tabs.conversion }));
    expect(await screen.findByText(t.students.sources.instagram)).toBeTruthy();
    await waitFor(() => expect(calls.some((c) => c.path === '/reports/leads')).toBe(true));
  });
});
