import {
  type AttendanceReportResponse,
  type BacktestReportResponse,
  type ChurnRiskResponse,
  type CohortReportResponse,
  type DebtAgingResponse,
  type GroupOccupancyResponse,
  type LeadsConversionReportResponse,
  REPORT_TYPES,
  type ReportType,
  type RevenueForecastResponse,
  type RevenueReportResponse,
  type SendReportRequest,
  type SendReportResult,
  type TeacherPerformanceReportResponse,
} from '@lg/contracts';
import { formatMoney, formatPeriod, miniappMessages as t, reportMessages as r } from '@lg/i18n';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';
import { periodRange, shiftPeriod } from './staff-finance.js';

const KEY = ['staff', 'reports'] as const;
const c = t.staffReports;

export type ReportGroupBy = 'month' | 'course' | 'group' | 'teacher';

/** Moliyaviy hisobotlar — `finance.view` (FR-FIN-3). */
const FINANCE: readonly ReportType[] = ['revenue', 'debt-aging'];
export const reportTypesFor = (permissions: readonly string[]): ReportType[] =>
  REPORT_TYPES.filter((x) => !FINANCE.includes(x) || permissions.includes('finance.view'));

/** Kesimlar: birinchisi — standart. */
export const REPORT_GROUPS: Partial<Record<ReportType, readonly ReportGroupBy[]>> = {
  revenue: ['month', 'course', 'group', 'teacher'],
  attendance: ['group', 'teacher'],
};

/** Davr tanlanadimi: qarz va saqlanish — bugungi holat; oylik tushum — 12 oy. */
export const hasPeriod = (type: ReportType, groupBy: ReportGroupBy | null): boolean =>
  type !== 'debt-aging' && type !== 'cohort' && groupBy !== 'month';

export interface ReportFilter {
  from?: string;
  to?: string;
  groupBy?: ReportGroupBy;
}

export function reportFilter(
  type: ReportType,
  groupBy: ReportGroupBy | null,
  months: { period: string; current: string },
): ReportFilter {
  const by = groupBy ? { groupBy } : {};
  if (hasPeriod(type, groupBy)) return { ...periodRange(months.period), ...by };
  if (type !== 'revenue') return by;
  const from = periodRange(shiftPeriod(months.current, -11)).from;
  return { from, to: periodRange(months.current).to, ...by };
}

/** Ekran qatori: pul (`bigint`) yoki tayyor matn. */
export interface ReportRow {
  id: string;
  title: string;
  subtitle: string;
  value: bigint | string;
  /** Qatordan ochiladigan o'quvchi. */
  studentId?: string;
}

export interface ReportView {
  kpi: { label: string; value: bigint | string }[];
  rows: ReportRow[];
}

/** Bazis punkt → «85,3%». */
export const pct = (bp: number): string => `${String(Math.round(bp / 10) / 10).replace('.', ',')}%`;

/** `{a}` o'rinlariga qiymat. */
const fill = (text: string, v: Record<string, string | number>): string =>
  Object.entries(v).reduce((s, [k, x]) => s.replace(`{${k}}`, String(x)), text);

const monthOr = (name: string): string =>
  /^\d{4}-\d{2}$/.test(name) ? formatPeriod(name) : name || r.unassigned;

function revenueView(d: RevenueReportResponse): ReportView {
  return {
    kpi: [
      { label: r.cols.revenue, value: BigInt(d.totalRevenue) },
      { label: r.cols.payments, value: String(d.totalPayments) },
    ],
    rows: d.items.map((i) => ({
      id: i.id,
      title: monthOr(i.name),
      subtitle: i.name ? fill(c.payments, { n: i.paymentCount, m: i.studentCount }) : '',
      value: BigInt(i.totalRevenue),
    })),
  };
}

function debtView(d: DebtAgingResponse): ReportView {
  const sorted = [...d.debtors].sort((a, b) => b.daysOverdue - a.daysOverdue);
  return {
    kpi: [
      { label: r.total, value: BigInt(d.totalDebt) },
      ...(['fresh', 'overdue', 'critical'] as const).map((b) => ({
        label: `${r.buckets[b]} (${d.buckets[b].studentCount})`,
        value: BigInt(d.buckets[b].totalDebt),
      })),
    ],
    rows: sorted.map((x) => ({
      id: x.studentId,
      studentId: x.studentId,
      title: x.studentName,
      subtitle: [x.groupName, x.daysOverdue > 0 ? fill(c.daysLate, { n: x.daysOverdue }) : c.notDue]
        .filter(Boolean)
        .join(' · '),
      value: BigInt(x.debt),
    })),
  };
}

const attendanceView = (d: AttendanceReportResponse): ReportView => ({
  kpi: [{ label: c.overall, value: pct(d.overallAttendancePercentBp) }],
  rows: [...d.items]
    .sort((a, b) => a.attendancePercentBp - b.attendancePercentBp)
    .map((i) => ({
      id: i.id,
      title: i.name,
      subtitle: fill(c.attendance, {
        n: i.totalLessons,
        p: i.presentCount,
        l: i.lateCount,
        a: i.absentCount,
        e: i.excusedCount,
      }),
      value: pct(i.attendancePercentBp),
    })),
});

const cohortView = (d: CohortReportResponse): ReportView => ({
  kpi: [],
  rows: d.cohorts.map((x) => ({
    id: x.cohortMonth,
    title: formatPeriod(x.cohortMonth),
    subtitle: [
      fill(c.cohortStart, { n: x.initialCount }),
      ...x.retention
        .slice(0, -1)
        .map((p) => fill(c.cohortPoint, { n: p.monthIndex, p: pct(p.retentionPercentBp) })),
    ].join(' · '),
    value: pct(x.retention.at(-1)?.retentionPercentBp ?? 0),
  })),
});

const sources: Record<string, string> = t.leads.sources;

const leadsView = (d: LeadsConversionReportResponse): ReportView => ({
  kpi: [
    { label: r.cols.leads, value: String(d.totalLeads) },
    { label: r.cols.won, value: `${d.totalWon} · ${pct(d.overallConversionPercentBp)}` },
  ],
  rows: d.bySource.map((s) => ({
    id: s.source,
    title: sources[s.source] ?? s.source,
    subtitle: fill(c.leads, {
      n: s.totalLeads,
      c: s.contactedCount,
      t: s.trialCount,
      w: s.wonCount,
    }),
    value: pct(s.conversionPercentBp),
  })),
});

const teacherView = (d: TeacherPerformanceReportResponse): ReportView => ({
  kpi: [],
  rows: d.items.map((i) => ({
    id: i.teacherId,
    title: i.teacherName,
    subtitle: [
      fill(c.teacher, { g: i.groupCount, s: i.studentCount, r: pct(i.retentionPercentBp) }),
      i.averageGradeScoreBp !== null && fill(c.grade, { n: pct(i.averageGradeScoreBp) }),
    ]
      .filter(Boolean)
      .join(' · '),
    value: pct(i.attendancePercentBp),
  })),
});

const query = (f: ReportFilter): string => {
  const q = new URLSearchParams(Object.entries(f).filter((e): e is [string, string] => !!e[1]));
  return q.size > 0 ? `?${q.toString()}` : '';
};

export function useReport(type: ReportType, f: ReportFilter) {
  const api = useApi();
  const get = <T>(path: string) => api.request<T>(`/reports/${path}${query(f)}`);
  const load: Record<ReportType, () => Promise<ReportView>> = {
    revenue: async () => revenueView(await get('revenue')),
    'debt-aging': async () => debtView(await get('debt-aging')),
    attendance: async () => attendanceView(await get('attendance')),
    cohort: async () => cohortView(await get('cohort')),
    leads: async () => leadsView(await get('leads')),
    'teacher-performance': async () => teacherView(await get('teacher-performance')),
  };
  return useQuery({
    queryKey: [...KEY, type, f],
    queryFn: () => load[type](),
    placeholderData: keepPreviousData,
  });
}

export function useSendReport(type: ReportType) {
  const api = useApi();
  return useMutation({
    mutationFn: (body: SendReportRequest) =>
      api.request<SendReportResult>(`/reports/${type}/send`, { method: 'POST', body }),
  });
}

export interface Forecasts {
  /** `finance.view` yo'q — `null`. */
  revenue: RevenueForecastResponse | null;
  backtest: BacktestReportResponse | null;
  churn: ChurnRiskResponse;
  occupancy: GroupOccupancyResponse;
}

export function useForecasts(finance: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: ['staff', 'forecasts', finance],
    queryFn: async (): Promise<Forecasts> => {
      const [revenue, backtest, churn, occupancy] = await Promise.all([
        finance ? api.request<RevenueForecastResponse>('/forecasts/revenue') : null,
        finance ? api.request<BacktestReportResponse>('/forecasts/backtest') : null,
        api.request<ChurnRiskResponse>('/forecasts/churn'),
        api.request<GroupOccupancyResponse>('/forecasts/occupancy'),
      ]);
      return { revenue, backtest, churn, occupancy };
    },
  });
}

/** Ball bergan sabablar («nega»), kuchlisidan. */
export const churnReasons = (factors: ChurnRiskResponse['items'][number]['factors']): string =>
  factors
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.reason)
    .join(' · ');

export const moneyRange = (from: string, to: string): string =>
  fill(t.staffForecasts.range, {
    from: formatMoney(BigInt(from), { withCurrency: false }),
    to: formatMoney(BigInt(to)),
  });

export const reportViews = {
  revenueView,
  debtView,
  attendanceView,
  cohortView,
  leadsView,
  teacherView,
};
