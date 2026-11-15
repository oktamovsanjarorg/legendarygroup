import { formatYmd, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader, SelectField } from '@lg/ui-web';
import { Download, FileSpreadsheet, Plus, Send } from 'lucide-react';
import type { ReactNode } from 'react';
import type { TestItem, TestResultRow } from './types.js';

const c = t.tests.cols;
const pct = new Intl.NumberFormat('uz', { maximumFractionDigits: 1 });
type LoadError = { message: string; requestId?: string; onRetry: () => void };

interface Props {
  groups: readonly { value: string; label: string }[];
  groupId: string | null;
  onGroup: (id: string) => void;
  tests: readonly TestItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  results?: readonly TestResultRow[];
  onNew?: () => void;
  onTemplate?: () => void;
  onImportFile?: (file: File) => void;
  onPublish?: () => void;
  busy?: boolean;
  message?: { text: string; error: boolean };
  /** Import preview / forma (route beradi). */
  children?: ReactNode;
  loading?: boolean;
  loadError?: LoadError;
}

const testColumns = (selectedId: string | null): ColumnDef<TestItem, unknown>[] => [
  {
    accessorKey: 'title',
    header: c.title,
    cell: ({ row }) => (
      <span className={row.original.id === selectedId ? 'font-semibold text-primary' : 'text-text'}>
        {row.original.title}
      </span>
    ),
  },
  { accessorKey: 'date', header: c.date, cell: ({ row }) => formatYmd(row.original.date) },
  { accessorKey: 'maxScore', header: c.maxScore },
  {
    accessorKey: 'status',
    header: c.status,
    cell: ({ row }) => (
      <Badge tone={row.original.status === 'published' ? 'success' : 'muted'}>
        {t.tests.status[row.original.status]}
      </Badge>
    ),
  },
];

const resultColumns: ColumnDef<TestResultRow, unknown>[] = [
  { accessorKey: 'studentName', header: c.student },
  {
    accessorKey: 'studentCode',
    header: c.code,
    cell: ({ row }) => row.original.studentCode ?? '—',
  },
  { accessorKey: 'score', header: c.score },
  {
    accessorKey: 'percent',
    header: c.percent,
    cell: ({ row }) => `${pct.format(row.original.percent)}%`,
  },
];

function Actions(p: Props & { draft: boolean }) {
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {p.onTemplate && (
        <Button variant="secondary" onClick={p.onTemplate}>
          <Download className="size-4" aria-hidden />
          {t.tests.downloadTemplate}
        </Button>
      )}
      {p.draft && p.onImportFile && (
        <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-text hover:bg-surface">
          <FileSpreadsheet className="size-4 text-success" aria-hidden />
          {t.tests.importExcel}
          <input
            type="file"
            accept=".xlsx"
            aria-label={t.tests.import.file}
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) p.onImportFile?.(f);
              e.target.value = '';
            }}
          />
        </label>
      )}
      {p.draft && p.onPublish && (
        <Button onClick={p.onPublish} loading={p.busy}>
          <Send className="size-4" aria-hidden />
          {t.tests.publish}
        </Button>
      )}
    </div>
  );
}

function Header(p: Props) {
  return (
    <>
      <PageHeader
        title={t.tests.title}
        description={t.tests.subtitle}
        actions={
          p.onNew &&
          p.groupId && (
            <Button onClick={p.onNew}>
              <Plus className="size-4" aria-hidden />
              {t.tests.newTest}
            </Button>
          )
        }
      />
      <div className="mb-4 max-w-sm">
        <SelectField
          label={t.tests.group}
          options={[{ value: '', label: t.tests.pickGroup }, ...p.groups]}
          value={p.groupId ?? ''}
          onChange={(e) => e.target.value && p.onGroup(e.target.value)}
        />
      </div>
    </>
  );
}

/** W-19 Testlar (FR-GRD-4/5, T-302, BR-34/35). */
export function TestsView(p: Props) {
  const selected = p.tests.find((x) => x.id === p.selectedId);
  return (
    <>
      <Header {...p} />
      {p.message && (
        <p
          role={p.message.error ? 'alert' : 'status'}
          className={`mb-3 text-sm ${p.message.error ? 'text-danger' : 'text-success'}`}
        >
          {p.message.text}
        </p>
      )}
      {p.groupId && (
        <DataTable
          data={p.tests}
          columns={testColumns(p.selectedId)}
          getRowId={(r) => r.id}
          numeric={['maxScore']}
          onRowClick={(r) => p.onSelect(r.id)}
          empty={{ title: t.tests.empty }}
          loading={p.loading}
          error={p.loadError}
        />
      )}
      {selected && (
        <section className="mt-6">
          <h3 className="mb-2 font-semibold text-text">{selected.title}</h3>
          <Actions {...p} draft={selected.status === 'draft'} />
          {p.children}
          <DataTable
            data={p.results ?? []}
            columns={resultColumns}
            getRowId={(r) => r.id}
            numeric={['score', 'percent']}
            empty={{ title: t.tests.noResults }}
            loading={p.results === undefined}
          />
        </section>
      )}
    </>
  );
}
