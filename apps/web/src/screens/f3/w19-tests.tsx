import { formatDateShort, formatDateTime, webMessages as t } from '@lg/i18n';
import {
  Badge,
  Button,
  type ColumnDef,
  DataTable,
  Drawer,
  PageHeader,
  SelectField,
  Tabs,
} from '@lg/ui-web';
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Plus, Upload } from 'lucide-react';
import { useState } from 'react';
import type { ImportHistoryItem, ImportPreviewRow, TestItem } from './types.js';

interface Props {
  tests: readonly TestItem[];
  history: readonly ImportHistoryItem[];
  previewRows?: readonly ImportPreviewRow[];
  activeTab?: 'list' | 'history';
  onNewTest?: () => void;
  onImportConfirm?: () => void;
}

const oneDecFmt = new Intl.NumberFormat('uz', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const testColumns: ColumnDef<TestItem, unknown>[] = [
  {
    accessorKey: 'title',
    header: t.tests.cols.title,
    cell: ({ row }) => <span className="font-medium text-text">{row.original.title}</span>,
  },
  { accessorKey: 'group', header: t.tests.cols.group },
  {
    accessorKey: 'date',
    header: t.tests.cols.date,
    cell: ({ row }) => formatDateShort(row.original.date),
  },
  { accessorKey: 'maxScore', header: t.tests.cols.maxScore },
  {
    id: 'participants',
    header: t.tests.cols.participants,
    cell: ({ row }) => `${row.original.participants} / ${row.original.totalStudents}`,
  },
  {
    accessorKey: 'avgScore',
    header: t.tests.cols.avgScore,
    cell: ({ row }) => oneDecFmt.format(row.original.avgScore),
  },
  {
    accessorKey: 'status',
    header: t.tests.cols.status,
    cell: ({ row }) => (
      <Badge tone={row.original.status === 'published' ? 'success' : 'muted'}>
        {t.tests.status[row.original.status]}
      </Badge>
    ),
  },
];

const historyColumns: ColumnDef<ImportHistoryItem, unknown>[] = [
  {
    accessorKey: 'fileName',
    header: t.tests.historyCols.fileName,
    cell: ({ row }) => (
      <span className="flex items-center gap-2 font-medium text-text">
        <FileSpreadsheet className="size-4 text-success" aria-hidden />
        {row.original.fileName}
      </span>
    ),
  },
  {
    accessorKey: 'date',
    header: t.tests.historyCols.date,
    cell: ({ row }) => formatDateTime(row.original.date),
  },
  { accessorKey: 'author', header: t.tests.historyCols.author },
  { accessorKey: 'totalRows', header: t.tests.historyCols.totalRows },
  {
    accessorKey: 'successCount',
    header: t.tests.historyCols.successCount,
    cell: ({ row }) => <span className="text-success">{row.original.successCount}</span>,
  },
  {
    accessorKey: 'errorCount',
    header: t.tests.historyCols.errorCount,
    cell: ({ row }) =>
      row.original.errorCount > 0 ? (
        <span className="text-danger">{row.original.errorCount}</span>
      ) : (
        '0'
      ),
  },
  {
    accessorKey: 'status',
    header: t.tests.historyCols.status,
    cell: ({ row }) => (
      <Badge tone={row.original.status === 'success' ? 'success' : 'warning'}>
        {row.original.status === 'success' ? 'Muvaffaqiyatli' : 'Ogohlantirish'}
      </Badge>
    ),
  },
];

function ImportPreviewList({ rows }: { rows: readonly ImportPreviewRow[] }) {
  return (
    <div className="rounded-md border border-border p-3">
      <h4 className="font-medium text-text">{t.tests.import.step3}</h4>
      <div className="mt-2 space-y-1.5">
        {rows.map((r) => (
          <div
            key={r.studentCode}
            className="flex items-center justify-between text-xs border-b border-border/50 py-1"
          >
            <span className="flex items-center gap-1.5">
              {r.error ? (
                <AlertCircle className="size-3.5 text-danger" aria-hidden />
              ) : (
                <CheckCircle2 className="size-3.5 text-success" aria-hidden />
              )}
              <span className="font-medium">{r.studentName}</span>
              <span className="text-text-muted">({r.studentCode})</span>
            </span>
            <span className={r.error ? 'text-danger font-medium' : 'font-semibold'}>
              {r.error ? r.error : `${r.score} ball`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImportDrawerContent({
  previewRows,
  onConfirm,
}: {
  previewRows: readonly ImportPreviewRow[];
  onConfirm: () => void;
}) {
  const [colStudent, setColStudent] = useState('B');
  const [colScore, setColScore] = useState('C');
  const colOptions = [
    { value: 'A', label: 'A ustuni (Kod)' },
    { value: 'B', label: 'B ustuni (F.I.Sh)' },
    { value: 'C', label: 'C ustuni (Ball)' },
    { value: 'D', label: 'D ustuni (Izoh)' },
  ];

  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-lg border-2 border-dashed border-border p-4 text-center">
        <Upload className="mx-auto size-8 text-primary" aria-hidden />
        <p className="mt-1 font-medium">{t.tests.import.dropzone}</p>
        <p className="text-xs text-text-muted">{t.tests.import.uploadHint}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={t.tests.import.colStudent}
          options={colOptions}
          value={colStudent}
          onChange={(e) => setColStudent(e.target.value)}
        />
        <SelectField
          label={t.tests.import.colScore}
          options={colOptions}
          value={colScore}
          onChange={(e) => setColScore(e.target.value)}
        />
      </div>

      <ImportPreviewList rows={previewRows} />

      <Button onClick={onConfirm}>
        <CheckCircle2 className="size-4" aria-hidden />
        {t.tests.import.confirmSubmit}
      </Button>
    </div>
  );
}

function TabContent({
  tab,
  tests,
  history,
}: {
  tab: 'list' | 'history';
  tests: readonly TestItem[];
  history: readonly ImportHistoryItem[];
}) {
  if (tab === 'list') {
    return (
      <DataTable
        data={tests}
        columns={testColumns}
        getRowId={(r) => r.id}
        numeric={['maxScore', 'participants', 'avgScore']}
        empty={{ title: t.tests.empty }}
      />
    );
  }
  return (
    <DataTable
      data={history}
      columns={historyColumns}
      getRowId={(r) => r.id}
      numeric={['totalRows', 'successCount', 'errorCount']}
      empty={{ title: t.tests.empty }}
    />
  );
}

/** W-19 Testlar va importlar (FR-GRD-3/4/6, BR-35). */
export function TestsView({
  tests,
  history,
  previewRows = [],
  activeTab = 'list',
  onNewTest,
  onImportConfirm,
}: Props) {
  const [tab, setTab] = useState<'list' | 'history'>(activeTab);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const tabItems = [
    { value: 'list' as const, label: t.tests.tabs.list, count: tests.length },
    { value: 'history' as const, label: t.tests.tabs.history, count: history.length },
  ];

  return (
    <>
      <PageHeader
        title={t.tests.title}
        description={t.tests.subtitle}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setDrawerOpen(true)}>
              <FileSpreadsheet className="size-4 text-success" aria-hidden />
              {t.tests.importExcel}
            </Button>
            <Button onClick={onNewTest}>
              <Plus className="size-4" aria-hidden />
              {t.tests.newTest}
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex items-center justify-between">
        <Tabs label={t.tests.title} value={tab} items={tabItems} onChange={setTab} />
        <button
          type="button"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <Download className="size-3.5" aria-hidden />
          {t.tests.downloadTemplate}
        </button>
      </div>

      <TabContent tab={tab} tests={tests} history={history} />

      <Drawer
        open={drawerOpen}
        title={t.tests.import.title}
        closeLabel={t.common.cancel}
        onClose={() => setDrawerOpen(false)}
      >
        <ImportDrawerContent
          previewRows={previewRows}
          onConfirm={() => {
            onImportConfirm?.();
            setDrawerOpen(false);
          }}
        />
      </Drawer>
    </>
  );
}
