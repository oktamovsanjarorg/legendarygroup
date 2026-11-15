import { formatMoney, webMessages as t } from '@lg/i18n';
import type { ColumnDef } from '@lg/ui-web';
import type {
  ReportAgingRow,
  ReportAttendanceRow,
  ReportConversionRow,
  ReportRevenueRow,
  ReportTeacherRow,
} from './types.js';

const c = t.reports.cols;
const pct = new Intl.NumberFormat('uz', { maximumFractionDigits: 1 });
export const fmtPercent = (v: number): string => `${pct.format(v)}%`;

const sources: Record<string, string> = t.students.sources;
/** Manba kodi → yorliq (noma'lum/bo'sh — "Boshqa"). */
export const sourceLabel = (s: string): string => sources[s] ?? sources.other ?? s;

const cmpBig = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);
const strong = (v: string, tone = 'text-text') => (
  <span className={`font-semibold ${tone}`}>{v}</span>
);

export const revenueColumns: ColumnDef<ReportRevenueRow, unknown>[] = [
  { accessorKey: 'name', header: c.name },
  { accessorKey: 'students', header: c.students },
  { accessorKey: 'payments', header: c.payments },
  {
    accessorKey: 'revenue',
    header: c.revenue,
    sortingFn: (a, b) => cmpBig(a.original.revenue, b.original.revenue),
    cell: ({ row }) => strong(formatMoney(row.original.revenue)),
  },
];

export const agingColumns: ColumnDef<ReportAgingRow, unknown>[] = [
  {
    accessorKey: 'bucket',
    header: t.reports.agingCols.interval,
    cell: ({ row }) => t.reports.agingIntervals[row.original.bucket],
  },
  { accessorKey: 'count', header: t.reports.agingCols.count },
  {
    accessorKey: 'debt',
    header: t.reports.agingCols.debtAmount,
    cell: ({ row }) => strong(formatMoney(row.original.debt), 'text-danger'),
  },
];

export const attendanceColumns: ColumnDef<ReportAttendanceRow, unknown>[] = [
  { accessorKey: 'name', header: c.name },
  { accessorKey: 'lessons', header: c.lessons },
  { accessorKey: 'present', header: c.present },
  { accessorKey: 'absent', header: c.absent },
  {
    accessorKey: 'percent',
    header: c.attendance,
    cell: ({ row }) => strong(fmtPercent(row.original.percent), 'text-success'),
  },
];

export const conversionColumns: ColumnDef<ReportConversionRow, unknown>[] = [
  {
    accessorKey: 'source',
    header: c.source,
    cell: ({ row }) => sourceLabel(row.original.source),
  },
  { accessorKey: 'total', header: c.total },
  { accessorKey: 'contacted', header: c.contacted },
  { accessorKey: 'trial', header: c.trial },
  { accessorKey: 'won', header: c.won },
  {
    accessorKey: 'percent',
    header: c.conversion,
    cell: ({ row }) => strong(fmtPercent(row.original.percent)),
  },
];

export const teacherColumns: ColumnDef<ReportTeacherRow, unknown>[] = [
  { accessorKey: 'teacher', header: c.teacher },
  { accessorKey: 'groups', header: c.groups },
  { accessorKey: 'students', header: c.students },
  {
    accessorKey: 'attendancePercent',
    header: c.attendance,
    cell: ({ row }) => fmtPercent(row.original.attendancePercent),
  },
  {
    accessorKey: 'retentionPercent',
    header: c.retention,
    cell: ({ row }) => fmtPercent(row.original.retentionPercent),
  },
  {
    accessorKey: 'avgGrade',
    header: c.avgGrade,
    cell: ({ row }) => {
      const g = row.original.avgGrade;
      return g === null ? '—' : strong(pct.format(g), 'text-primary');
    },
  },
];
