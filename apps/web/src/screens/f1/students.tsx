import { formatMoney, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader, Tabs } from '@lg/ui-web';
import { Plus, Search } from 'lucide-react';
import type { StudentRow, StudentStatus } from './types.js';

export type StudentFilter = 'active' | 'debtors' | 'frozen' | 'archived';

const compareBigint = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);

const STATUS_TONE = { active: 'success', frozen: 'warning', archived: 'muted' } as const;

const muted = (text: string) => <span className="text-text-muted">{text}</span>;

const base: ColumnDef<StudentRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: t.students.cols.name,
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-xs text-text-muted">{row.original.code}</span>
      </span>
    ),
  },
  {
    id: 'groups',
    header: t.students.cols.groups,
    enableSorting: false,
    cell: ({ row }) => row.original.groups.join(', ') || muted(t.students.noGroups),
  },
  {
    id: 'guardian',
    header: t.students.cols.guardian,
    enableSorting: false,
    cell: ({ row: { original: r } }) =>
      r.guardian === null ? (
        muted(t.students.noGuardian)
      ) : (
        <span className="flex flex-col">
          {r.guardian}
          {r.guardianPhone && (
            <span className="text-xs text-text-muted">{formatPhone(r.guardianPhone)}</span>
          )}
        </span>
      ),
  },
];
const debt: ColumnDef<StudentRow, unknown> = {
  id: 'debt',
  // Pul — faqat bigint (CLAUDE.md): saralash ham bigint taqqoslash bilan.
  accessorFn: (r) => r.debt,
  sortingFn: (a, b) => compareBigint(a.original.debt ?? 0n, b.original.debt ?? 0n),
  header: t.students.cols.debt,
  cell: ({ row }) =>
    (row.original.debt ?? 0n) > 0n ? (
      <span className="text-danger">{formatMoney(row.original.debt ?? 0n)}</span>
    ) : (
      '—'
    ),
};
const status: ColumnDef<StudentRow, unknown> = {
  accessorKey: 'status',
  header: t.students.cols.status,
  cell: ({ row }) => {
    const s: StudentStatus = row.original.status;
    return <Badge tone={STATUS_TONE[s]}>{t.students.status[s]}</Badge>;
  },
};
const WITH_DEBT = [...base, debt, status];
const WITHOUT_DEBT = [...base, status];
const ALL_FILTERS = Object.keys(t.students.filters) as StudentFilter[];

interface Props {
  rows: readonly StudentRow[];
  filter: StudentFilter;
  /** Ko'rsatiladigan filtrlar (standart — hammasi; qarzdorlar — T-208 bilan). */
  filters?: readonly StudentFilter[];
  counts?: Partial<Record<StudentFilter, number>>;
  query: string;
  loading?: boolean;
  error?: { message: string; requestId?: string; onRetry: () => void };
  onFilter: (f: StudentFilter) => void;
  onQuery: (q: string) => void;
  onOpen: (s: StudentRow) => void;
  /** `student.manage` yo'q — tugma ko'rinmaydi. */
  onNew?: () => void;
  /** Cursor sahifalash: keyingi sahifa bor bo'lsa. */
  onLoadMore?: () => void;
  loadingMore?: boolean;
}

/** W-05 O'quvchilar (FR-STU-5/6): qidiruv (`oʻ`/`o'` bir xil), filtrlar, jadval. */
export function StudentsView(p: Props) {
  return (
    <>
      <PageHeader
        title={t.students.title}
        actions={
          p.onNew && (
            <Button onClick={p.onNew}>
              <Plus className="size-4" aria-hidden />
              {t.students.new}
            </Button>
          )
        }
      />
      <div className="mb-4 flex max-w-md items-center gap-2 rounded-md border border-border bg-bg px-3">
        <Search className="size-4 text-text-muted" aria-hidden />
        <input
          type="search"
          aria-label={t.common.search}
          placeholder={t.common.search}
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          className="min-h-10 flex-1 bg-transparent text-sm text-text outline-none"
        />
      </div>
      <Tabs
        label={t.students.title}
        value={p.filter}
        onChange={p.onFilter}
        items={(p.filters ?? ALL_FILTERS).map((f) => ({
          value: f,
          label: t.students.filters[f],
          count: p.counts?.[f],
        }))}
      />
      <DataTable
        columns={p.rows.some((r) => r.debt !== undefined) ? WITH_DEBT : WITHOUT_DEBT}
        data={p.rows}
        getRowId={(r) => r.id}
        numeric={['debt']}
        loading={p.loading}
        error={p.error}
        empty={{ title: t.students.empty }}
        onRowClick={p.onOpen}
        onLoadMore={p.onLoadMore}
        loadingMore={p.loadingMore}
      />
    </>
  );
}
