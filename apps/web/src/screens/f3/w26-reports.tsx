import { formatMoney, webMessages as t } from '@lg/i18n';
import { Button, Card, type ColumnDef, DataTable, PageHeader, Tabs } from '@lg/ui-web';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';
import type {
  ReportAgingRow,
  ReportAttendanceRow,
  ReportConversionRow,
  ReportRevenueRow,
  ReportTeacherRow,
} from './types.js';

interface Props {
  revenueData: readonly ReportRevenueRow[];
  agingData: readonly ReportAgingRow[];
  attendanceData: readonly ReportAttendanceRow[];
  conversionData: readonly ReportConversionRow[];
  teacherData: readonly ReportTeacherRow[];
  activeTab?: 'revenue' | 'aging' | 'attendance' | 'conversion' | 'teachers';
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}

const oneDecFmt = new Intl.NumberFormat('uz', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const revenueColumns: ColumnDef<ReportRevenueRow, unknown>[] = [
  {
    accessorKey: 'course',
    header: t.reports.cols.course,
    cell: ({ row }) => <span className="font-medium text-text">{row.original.course}</span>,
  },
  { accessorKey: 'studentsCount', header: t.reports.cols.students },
  {
    accessorKey: 'revenue',
    header: t.reports.cols.revenue,
    cell: ({ row }) => (
      <span className="font-semibold text-text">{formatMoney(row.original.revenue)}</span>
    ),
  },
  {
    accessorKey: 'sharePercent',
    header: t.reports.agingCols.share,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <div className="w-16 h-2 rounded-full bg-surface-alt overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${row.original.sharePercent}%` }}
          />
        </div>
        <span className="w-8 text-right font-medium">{row.original.sharePercent}%</span>
      </div>
    ),
  },
];

const agingColumns: ColumnDef<ReportAgingRow, unknown>[] = [
  {
    accessorKey: 'interval',
    header: t.reports.agingCols.interval,
    cell: ({ row }) => <span className="font-medium text-text">{row.original.interval}</span>,
  },
  { accessorKey: 'count', header: t.reports.agingCols.count },
  {
    accessorKey: 'debtAmount',
    header: t.reports.agingCols.debtAmount,
    cell: ({ row }) => (
      <span className="font-semibold text-danger">{formatMoney(row.original.debtAmount)}</span>
    ),
  },
  {
    accessorKey: 'sharePercent',
    header: 'Ulush',
    cell: ({ row }) => `${row.original.sharePercent}%`,
  },
];

const attendanceColumns: ColumnDef<ReportAttendanceRow, unknown>[] = [
  {
    accessorKey: 'course',
    header: t.reports.cols.course,
    cell: ({ row }) => <span className="font-medium text-text">{row.original.course}</span>,
  },
  { accessorKey: 'teacher', header: t.reports.cols.teacher },
  {
    accessorKey: 'attendancePercent',
    header: t.reports.cols.attendance,
    cell: ({ row }) => (
      <span className="font-semibold text-success">{row.original.attendancePercent}%</span>
    ),
  },
  {
    accessorKey: 'retentionPercent',
    header: t.reports.cols.retention,
    cell: ({ row }) => `${row.original.retentionPercent}%`,
  },
];

const conversionColumns: ColumnDef<ReportConversionRow, unknown>[] = [
  {
    accessorKey: 'stage',
    header: t.reports.cols.leadStage,
    cell: ({ row }) => <span className="font-medium text-text">{row.original.stage}</span>,
  },
  { accessorKey: 'count', header: t.reports.cols.count },
  {
    accessorKey: 'percent',
    header: t.reports.cols.conversion,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <div className="w-20 h-2 rounded-full bg-surface-alt overflow-hidden">
          <div
            className="h-full bg-success rounded-full"
            style={{ width: `${row.original.percent}%` }}
          />
        </div>
        <span className="w-8 text-right font-medium">{row.original.percent}%</span>
      </div>
    ),
  },
];

const teacherColumns: ColumnDef<ReportTeacherRow, unknown>[] = [
  {
    accessorKey: 'teacher',
    header: t.reports.cols.teacher,
    cell: ({ row }) => <span className="font-medium text-text">{row.original.teacher}</span>,
  },
  { accessorKey: 'groupsCount', header: 'Guruhlar' },
  { accessorKey: 'studentsCount', header: t.reports.cols.students },
  {
    accessorKey: 'attendancePercent',
    header: t.reports.cols.attendance,
    cell: ({ row }) => `${row.original.attendancePercent}%`,
  },
  {
    accessorKey: 'avgGrade',
    header: t.reports.cols.avgGrade,
    cell: ({ row }) => (
      <span className="font-semibold text-primary">{oneDecFmt.format(row.original.avgGrade)}</span>
    ),
  },
];

type ReportTab = 'revenue' | 'aging' | 'attendance' | 'conversion' | 'teachers';

function ReportKpis() {
  return (
    <div className="mb-6 grid grid-cols-4 gap-4">
      <Card className="p-4">
        <span className="text-xs text-text-muted">{t.reports.kpi.avgRetention}</span>
        <p className="text-xl font-semibold text-success">93.5%</p>
      </Card>
      <Card className="p-4">
        <span className="text-xs text-text-muted">{t.reports.kpi.avgAttendance}</span>
        <p className="text-xl font-semibold text-primary">91.8%</p>
      </Card>
      <Card className="p-4">
        <span className="text-xs text-text-muted">{t.reports.kpi.totalDebtors}</span>
        <p className="text-xl font-semibold text-danger">3 ta</p>
      </Card>
      <Card className="p-4">
        <span className="text-xs text-text-muted">{t.reports.kpi.conversionRate}</span>
        <p className="text-xl font-semibold text-text">47.8%</p>
      </Card>
    </div>
  );
}

function AcademicTabTable({
  tab,
  attendanceData,
  conversionData,
  teacherData,
}: {
  tab: 'attendance' | 'conversion' | 'teachers';
  attendanceData: readonly ReportAttendanceRow[];
  conversionData: readonly ReportConversionRow[];
  teacherData: readonly ReportTeacherRow[];
}) {
  if (tab === 'attendance') {
    return (
      <DataTable
        data={attendanceData}
        columns={attendanceColumns}
        getRowId={(r) => `${r.course}-${r.teacher}`}
        numeric={['attendancePercent', 'retentionPercent']}
        empty={{ title: t.reports.empty }}
      />
    );
  }
  if (tab === 'conversion') {
    return (
      <DataTable
        data={conversionData}
        columns={conversionColumns}
        getRowId={(r) => r.stage}
        numeric={['count', 'percent']}
        empty={{ title: t.reports.empty }}
      />
    );
  }
  return (
    <DataTable
      data={teacherData}
      columns={teacherColumns}
      getRowId={(r) => r.teacher}
      numeric={['groupsCount', 'studentsCount', 'attendancePercent', 'avgGrade']}
      empty={{ title: t.reports.empty }}
    />
  );
}

function ReportTabTable(p: {
  tab: ReportTab;
  revenueData: readonly ReportRevenueRow[];
  agingData: readonly ReportAgingRow[];
  attendanceData: readonly ReportAttendanceRow[];
  conversionData: readonly ReportConversionRow[];
  teacherData: readonly ReportTeacherRow[];
}) {
  if (p.tab === 'revenue') {
    return (
      <DataTable
        data={p.revenueData}
        columns={revenueColumns}
        getRowId={(r) => r.course}
        numeric={['studentsCount', 'revenue', 'sharePercent']}
        empty={{ title: t.reports.empty }}
      />
    );
  }
  if (p.tab === 'aging') {
    return (
      <DataTable
        data={p.agingData}
        columns={agingColumns}
        getRowId={(r) => r.interval}
        numeric={['count', 'debtAmount', 'sharePercent']}
        empty={{ title: t.reports.empty }}
      />
    );
  }
  return (
    <AcademicTabTable
      tab={p.tab}
      attendanceData={p.attendanceData}
      conversionData={p.conversionData}
      teacherData={p.teacherData}
    />
  );
}

/** W-26 Hisobotlar (FR-DASH-2/4). */
export function ReportsView({
  revenueData,
  agingData,
  attendanceData,
  conversionData,
  teacherData,
  activeTab = 'revenue',
  onExportExcel,
  onExportPdf,
}: Props) {
  const [tab, setTab] = useState<ReportTab>(activeTab);

  const tabItems = [
    { value: 'revenue' as const, label: t.reports.tabs.revenue },
    { value: 'aging' as const, label: t.reports.tabs.aging },
    { value: 'attendance' as const, label: t.reports.tabs.attendance },
    { value: 'conversion' as const, label: t.reports.tabs.conversion },
    { value: 'teachers' as const, label: t.reports.tabs.teachers },
  ];

  return (
    <>
      <PageHeader
        title={t.reports.title}
        description={t.reports.subtitle}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onExportExcel}>
              <FileSpreadsheet className="size-4 text-success" aria-hidden />
              {t.reports.exportExcel}
            </Button>
            <Button variant="secondary" onClick={onExportPdf}>
              <Download className="size-4" aria-hidden />
              {t.reports.exportPdf}
            </Button>
          </div>
        }
      />

      <ReportKpis />

      <Tabs label={t.reports.title} value={tab} items={tabItems} onChange={setTab} />

      <ReportTabTable
        tab={tab}
        revenueData={revenueData}
        agingData={agingData}
        attendanceData={attendanceData}
        conversionData={conversionData}
        teacherData={teacherData}
      />
    </>
  );
}
