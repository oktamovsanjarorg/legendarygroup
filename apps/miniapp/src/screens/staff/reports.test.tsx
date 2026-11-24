import { miniappMessages as t, reportMessages as r } from '@lg/i18n';
import { TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  churnReasons,
  hasPeriod,
  reportFilter,
  reportTypesFor,
  reportViews,
} from '../../data/staff-reports.js';
import { ForecastsView } from './forecasts.js';
import { attendanceReport, debtReport, forecasts, revenueReport } from './reports-mock.js';
import { ReportDetailView } from './reports.js';

afterEach(cleanup);
const wrap = (ui: ReactNode): FakeWebApp => {
  const wa = createFakeWebApp();
  render(<TelegramProvider webApp={wa}>{ui}</TelegramProvider>);
  return wa;
};
const noop = () => undefined;

describe('MS-29 maʼlumot qatlami (T-158)', () => {
  it('FR-FIN-3: finance.view yoʻq — moliyaviy hisobot koʻrinmaydi', () => {
    expect(reportTypesFor([])).not.toContain('revenue');
    expect(reportTypesFor([])).not.toContain('debt-aging');
    expect(reportTypesFor(['finance.view'])).toHaveLength(6);
  });

  it('filtr: oylik tushum — 12 oy; qarz — davrsiz; qolgani — tanlangan oy', () => {
    const months = { period: '2026-02', current: '2026-11' };
    expect(reportFilter('revenue', 'month', months)).toEqual({
      from: '2025-12-01',
      to: '2026-11-30',
      groupBy: 'month',
    });
    expect(reportFilter('revenue', 'teacher', months)).toEqual({
      from: '2026-02-01',
      to: '2026-02-28',
      groupBy: 'teacher',
    });
    expect(reportFilter('debt-aging', null, months)).toEqual({});
    expect(reportFilter('leads', null, months)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
    expect(hasPeriod('cohort', null)).toBe(false);
  });

  it('qatorlar: guruhsiz pul nomlanadi; qarz — eng kechikkani birinchi', () => {
    expect(reportViews.revenueView(revenueReport).rows.map((x) => [x.title, x.value])).toEqual([
      [expect.stringMatching(/noyabr/i), 42_500_000n],
      [r.unassigned, -150_000n],
    ]);
    const debt = reportViews.debtView(debtReport).rows;
    expect(debt.map((x) => x.studentId)).toEqual(['s2', 's1']);
    expect(debt[1]?.subtitle).toContain(t.staffReports.notDue);
    expect(reportViews.attendanceView(attendanceReport).kpi[0]?.value).toBe('86,1%');
  });

  it('BR-36 «nega»: faqat ball bergan sabab, kuchlisi birinchi', () => {
    const [risky] = forecasts.churn.items;
    expect(churnReasons(risky!.factors)).toBe(
      'Oxirgi 4 haftada darslarning 100% iga kelmagan · Toʻlov 45 kunga kechikkan',
    );
  });
});

describe('MS-29/MS-30 ekranlari', () => {
  it('fayl: MainButton → Excel/PDF tanlovi; qarzdor — kartochkaga', () => {
    const onSend = vi.fn();
    const onStudent = vi.fn();
    const wa = wrap(
      <ReportDetailView
        type="debt-aging"
        view={reportViews.debtView(debtReport)}
        groups={[]}
        groupBy={null}
        onGroupBy={noop}
        period={null}
        sending={false}
        onSend={onSend}
        onStudent={onStudent}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Soliyeva/ }));
    expect(onStudent).toHaveBeenCalledWith('s2');
    act(() => wa.MainButton.click());
    expect(onSend).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.staffReports.pdf }));
    expect(onSend).toHaveBeenCalledWith('pdf');
  });

  it('prognoz: standart — faqat xavflilar; Admin’da pul koʻrinmaydi', () => {
    const onStudent = vi.fn();
    wrap(
      <ForecastsView
        data={{ ...forecasts, revenue: null, backtest: null }}
        onStudent={onStudent}
      />,
    );
    expect(screen.queryByText(t.staffForecasts.revenue)).toBeNull();
    expect(screen.queryByText('Karimov Ali')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Soliyeva/ }));
    expect(onStudent).toHaveBeenCalledWith('s2');
    fireEvent.click(screen.getByRole('radio', { name: t.staffForecasts.all }));
    expect(screen.getByText('Karimov Ali')).toBeDefined();
  });

  it('prognoz: tushum oraligʻi va model aniqligi', () => {
    wrap(<ForecastsView data={forecasts} onStudent={noop} />);
    expect(screen.getByText(/38.950.000 – 43.050.000/)).toBeDefined();
    expect(screen.getByText(/farq 4,7%/)).toBeDefined();
  });
});
