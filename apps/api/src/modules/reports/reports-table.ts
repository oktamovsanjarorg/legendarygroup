import type {
  AttendanceReportResponse,
  CohortReportResponse,
  DebtAgingResponse,
  LeadsConversionReportResponse,
  ReportType,
  RevenueReportResponse,
  TeacherPerformanceReportResponse,
} from '@lg/contracts';
import { formatPeriod, formatYmd, miniappMessages, reportMessages as t } from '@lg/i18n';

/** Excel/PDF uchun yagona jadval: `bigint` — so'm, `number` — son, `string` — tayyor matn. */
export type Cell = string | number | bigint | null;

export interface ReportTable {
  title: string;
  subtitle: string;
  columns: string[];
  rows: Cell[][];
  /** Oxirgi "Jami" qatori. */
  total?: Cell[];
}

export interface ReportDataMap {
  revenue: RevenueReportResponse;
  'debt-aging': DebtAgingResponse;
  attendance: AttendanceReportResponse;
  cohort: CohortReportResponse;
  leads: LeadsConversionReportResponse;
  'teacher-performance': TeacherPerformanceReportResponse;
}

const c = t.cols;
/** Bazis punkt → «85,3%». */
const pct = (bp: number): string => `${String(Math.round(bp / 10) / 10).replace('.', ',')}%`;
const sources: Record<string, string> = miniappMessages.leads.sources;
export const sourceLabel = (s: string): string => sources[s] ?? s;
const monthOr = (name: string): string =>
  /^\d{4}-\d{2}$/.test(name) ? formatPeriod(name) : name || t.unassigned;

type Body = Pick<ReportTable, 'columns' | 'rows' | 'total'>;

const COHORT_MONTHS = [0, 1, 2, 3];

const BUILDERS: { [K in ReportType]: (d: ReportDataMap[K]) => Body } = {
  revenue: (d) => ({
    columns: [c.name, c.revenue, c.payments, c.students],
    rows: d.items.map((i) => [
      monthOr(i.name),
      BigInt(i.totalRevenue),
      i.paymentCount,
      i.studentCount,
    ]),
    total: [t.total, BigInt(d.totalRevenue), d.totalPayments, null],
  }),
  'debt-aging': (d) => ({
    columns: [c.code, c.student, c.group, c.debt, c.days, c.bucket],
    rows: d.debtors.map((x) => [
      x.studentCode,
      x.studentName,
      x.groupName,
      BigInt(x.debt),
      x.daysOverdue,
      t.buckets[x.bucket],
    ]),
    total: [t.total, d.totalDebtors, null, BigInt(d.totalDebt), null, null],
  }),
  attendance: (d) => ({
    columns: [c.name, c.lessons, c.present, c.late, c.absent, c.excused, c.percent],
    rows: d.items.map((i) => [
      i.name,
      i.totalLessons,
      i.presentCount,
      i.lateCount,
      i.absentCount,
      i.excusedCount,
      pct(i.attendancePercentBp),
    ]),
    total: [t.total, null, null, null, null, null, pct(d.overallAttendancePercentBp)],
  }),
  cohort: (d) => ({
    columns: [c.month, c.started, ...COHORT_MONTHS.map((n) => c.monthN.replace('{n}', String(n)))],
    rows: d.cohorts.map((x) => [
      formatPeriod(x.cohortMonth),
      x.initialCount,
      ...COHORT_MONTHS.map((n) => {
        const p = x.retention.find((r) => r.monthIndex === n);
        return p ? pct(p.retentionPercentBp) : null;
      }),
    ]),
  }),
  leads: (d) => ({
    columns: [c.source, c.leads, c.contacted, c.trial, c.won, c.percent],
    rows: d.bySource.map((s) => [
      sourceLabel(s.source),
      s.totalLeads,
      s.contactedCount,
      s.trialCount,
      s.wonCount,
      pct(s.conversionPercentBp),
    ]),
    total: [t.total, d.totalLeads, null, null, d.totalWon, pct(d.overallConversionPercentBp)],
  }),
  'teacher-performance': (d) => ({
    columns: [c.teacher, c.groups, c.students, c.attendance, c.retention, c.grade],
    rows: d.items.map((i) => [
      i.teacherName,
      i.groupCount,
      i.studentCount,
      pct(i.attendancePercentBp),
      pct(i.retentionPercentBp),
      i.averageGradeScoreBp === null ? null : pct(i.averageGradeScoreBp),
    ]),
  }),
};

const subtitle = (f: { from?: string; to?: string }, today: string): string =>
  f.from && f.to
    ? t.period.replace('{from}', formatYmd(f.from)).replace('{to}', formatYmd(f.to))
    : t.asOf.replace('{date}', formatYmd(today));

/** Hisobot turi va ma'lumoti → jadval. */
export function reportTable<K extends ReportType>(
  type: K,
  data: ReportDataMap[K],
  ctx: { from?: string; to?: string; today: string },
): ReportTable {
  return { title: t.titles[type], subtitle: subtitle(ctx, ctx.today), ...BUILDERS[type](data) };
}
