import type {
  ChurnRiskResponse,
  GroupOccupancyResponse,
  RevenueForecastResponse,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { toChurn } from './index.js';

const factor = (
  f: 'attendance_drop' | 'payment_delay' | 'grade_drop' | 'bot_unresponsive',
  s: number,
) => ({
  factor: f,
  score: s,
  weight: 10,
  reason: '',
});
const churn: ChurnRiskResponse = {
  totalStudents: 12,
  atRiskCount: 1,
  items: [
    {
      studentId: '11111111-1111-4111-8111-111111111111',
      studentName: 'Xavfli Oʻquvchi',
      studentCode: 7,
      groupName: 'EN-1',
      churnScore: 70,
      isAtRisk: true,
      factors: [
        factor('payment_delay', 30),
        factor('attendance_drop', 40),
        factor('grade_drop', 0),
      ],
    },
    {
      studentId: '22222222-2222-4222-8222-222222222222',
      studentName: 'Barqaror Oʻquvchi',
      studentCode: 8,
      groupName: 'EN-1',
      churnScore: 10,
      isAtRisk: false,
      factors: [factor('bot_unresponsive', 10)],
    },
  ],
};
const revenue: RevenueForecastResponse = {
  items: [
    {
      month: '2026-12',
      expected: '7000000',
      lowerBound: '6650000',
      upperBound: '7350000',
      activeEnrollmentsCount: 10,
      historicalCollectionRateBp: 9000,
    },
  ],
};
const occupancy: GroupOccupancyResponse = { items: [] };

const handler = (c: Call) => {
  if (c.path === '/forecasts/churn') return json(200, churn);
  if (c.path === '/forecasts/revenue') return json(200, revenue);
  if (c.path === '/forecasts/occupancy') return json(200, occupancy);
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-27 prognozlar (T-502, FR-DASH-3, BR-36)', () => {
  it('BR-36: faqat xavfli; sabablar — ball qoʻshganlar, kattasi birinchi', () => {
    const [row, ...rest] = toChurn(churn);
    expect(rest).toEqual([]);
    expect(row?.factors.map((f) => f.factor)).toEqual(['attendance_drop', 'payment_delay']);
  });

  it('forbidden: stats.operational yoʻq — ruxsat yoʻq, soʻrov ketmaydi', async () => {
    const calls = fakeApi(['finance.view'], handler);
    renderApp('/forecasts');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('FR-FIN-3: finance.view yoʻq — tushum prognozi soʻralmaydi', async () => {
    const calls = fakeApi(['stats.operational'], handler);
    renderApp('/forecasts');
    expect(await screen.findByText('Xavfli Oʻquvchi')).toBeTruthy();
    expect(screen.queryByText(t.forecasts.revenueTitle)).toBeNull();
    expect(calls.some((c) => c.path === '/forecasts/revenue')).toBe(false);
  });

  it('server qiymatlari: tushum oraligʻi, xavfli soni va jami', async () => {
    fakeApi(['stats.operational', 'finance.view'], handler);
    renderApp('/forecasts');
    expect(await screen.findByText(/7\s000\s000/)).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText(`${t.forecasts.factors.attendance_drop} · 40 ball`)).toBeTruthy();
    expect(screen.queryByText('Barqaror Oʻquvchi')).toBeNull();
  });
});
