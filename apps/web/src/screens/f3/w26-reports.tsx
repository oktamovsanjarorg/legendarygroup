import { formatMoney, webMessages as t } from '@lg/i18n';
import { Button, DataTable, KpiCard, PageHeader, Tabs } from '@lg/ui-web';
import { Download, FileSpreadsheet } from 'lucide-react';
import type {
  ReportAgingRow,
  ReportAttendanceRow,
  ReportConversionRow,
  ReportKpi,
  ReportRevenueRow,
  ReportTeacherRow,
} from './types.js';
import {
  agingColumns,
  attendanceColumns,
  conversionColumns,
  fmtPercent,
  revenueColumns,
  teacherColumns,
} from './w26-report-columns.js';

export type ReportTab = 'revenue' | 'aging' | 'attendance' | 'conversion' | 'teachers';

/** Faol tab ma'lumoti (route faqat shu tabni so'raydi). */
export type ReportData =
  | { tab: 'revenue'; rows: readonly ReportRevenueRow[] }
  | { tab: 'aging'; rows: readonly ReportAgingRow[] }
  | { tab: 'attendance'; rows: readonly ReportAttendanceRow[] }
  | { tab: 'conversion'; rows: readonly ReportConversionRow[] }
  | { tab: 'teachers'; rows: readonly ReportTeacherRow[] };

type LoadError = { message: string; requestId?: string; onRetry: () => void };

interface Props {
  /** Ruxsat bo'yicha ko'rinadigan tablar (moliya tablari — `finance.view`). */
  tabs: readonly ReportTab[];
  tab: ReportTab;
  onTab: (tab: ReportTab) => void;
  data?: ReportData;
  kpi: ReportKpi;
  loading?: boolean;
  loadError?: LoadError;
  onExport?: (format: 'excel' | 'pdf') => void;
  exporting?: boolean;
  exportError?: string;
}

interface Common {
  empty: { title: string };
  loading?: boolean;
  error?: LoadError;
}

function ReportTable({ tab, data, common }: { tab: ReportTab; data?: ReportData; common: Common }) {
  const rows = <T,>(want: ReportTab): readonly T[] =>
    data?.tab === want ? (data.rows as readonly T[]) : [];
  switch (tab) {
    case 'revenue':
      return (
        <DataTable
          {...common}
          data={rows<ReportRevenueRow>('revenue')}
          columns={revenueColumns}
          getRowId={(r) => r.id}
          numeric={['students', 'payments', 'revenue']}
        />
      );
    case 'aging':
      return (
        <DataTable
          {...common}
          data={rows<ReportAgingRow>('aging')}
          columns={agingColumns}
          getRowId={(r) => r.bucket}
          numeric={['count', 'debt']}
        />
      );
    case 'attendance':
      return (
        <DataTable
          {...common}
          data={rows<ReportAttendanceRow>('attendance')}
          columns={attendanceColumns}
          getRowId={(r) => r.id}
          numeric={['lessons', 'present', 'absent', 'percent']}
        />
      );
    case 'conversion':
      return (
        <DataTable
          {...common}
          data={rows<ReportConversionRow>('conversion')}
          columns={conversionColumns}
          getRowId={(r) => r.source}
          numeric={['total', 'contacted', 'trial', 'won', 'percent']}
        />
      );
    default:
      return (
        <DataTable
          {...common}
          data={rows<ReportTeacherRow>('teachers')}
          columns={teacherColumns}
          getRowId={(r) => r.id}
          numeric={['groups', 'students', 'attendancePercent', 'retentionPercent', 'avgGrade']}
        />
      );
  }
}

const orDash = <T,>(v: T | null, f: (x: T) => string) => (v === null ? '—' : f(v));

function Kpis({ kpi }: { kpi: ReportKpi }) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <KpiCard label={t.reports.kpi.revenue} value={orDash(kpi.revenue, formatMoney)} />
      <KpiCard
        label={t.reports.kpi.avgAttendance}
        value={orDash(kpi.attendancePercent, fmtPercent)}
      />
      <KpiCard label={t.reports.kpi.totalDebtors} value={orDash(kpi.debtors, String)} />
      <KpiCard
        label={t.reports.kpi.conversionRate}
        value={orDash(kpi.conversionPercent, fmtPercent)}
      />
    </div>
  );
}

function ExportActions({ onExport, exporting }: Pick<Props, 'onExport' | 'exporting'>) {
  if (!onExport) return null;
  return (
    <div className="flex gap-2">
      <Button variant="secondary" onClick={() => onExport('excel')} loading={exporting}>
        <FileSpreadsheet className="size-4 text-success" aria-hidden />
        {t.reports.exportExcel}
      </Button>
      <Button variant="secondary" onClick={() => onExport('pdf')} disabled={exporting}>
        <Download className="size-4" aria-hidden />
        {t.reports.exportPdf}
      </Button>
    </div>
  );
}

/** W-26 Hisobotlar (FR-DASH-2/4): server hisobotlari, Excel/PDF eksport. */
export function ReportsView(p: Props) {
  const items = p.tabs.map((value) => ({ value, label: t.reports.tabs[value] }));
  const common: Common = {
    empty: { title: t.reports.empty },
    loading: p.loading,
    error: p.loadError,
  };
  return (
    <>
      <PageHeader
        title={t.reports.title}
        description={t.reports.subtitle}
        actions={<ExportActions onExport={p.onExport} exporting={p.exporting} />}
      />
      <Kpis kpi={p.kpi} />
      {p.exportError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {p.exportError}
        </p>
      )}
      <Tabs label={t.reports.title} value={p.tab} items={items} onChange={p.onTab} />
      <ReportTable tab={p.tab} data={p.data} common={common} />
    </>
  );
}
