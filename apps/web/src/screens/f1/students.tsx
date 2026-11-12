import { formatMoney, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader, Tabs } from '@lg/ui-web';
import { Plus, Search } from 'lucide-react';
import type { StudentRow, StudentStatus } from './types.js';

export type StudentFilter = 'active' | 'debtors' | 'frozen' | 'archived';

const compareBigint = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);

const STATUS_TONE = { active: 'success', frozen: 'warning', archived: 'muted' } as const;

const columns: ColumnDef<StudentRow, unknown>[] = [
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
    cell: ({ row }) => row.original.groups.join(', '),
  },
  {
    id: 'guardian',
    header: t.students.cols.guardian,
    enableSorting: false,
    cell: ({ row }) => (
      <span className="flex flex-col">
        {row.original.guardian}
        <span className="text-xs text-text-muted">{formatPhone(row.original.guardianPhone)}</span>
      </span>
    ),
  },
  {
    id: 'debt',
    // Pul — faqat bigint (CLAUDE.md): saralash ham bigint taqqoslash bilan.
    accessorFn: (r) => r.debt,
    sortingFn: (a, b) => compareBigint(a.original.debt, b.original.debt),
    header: t.students.cols.debt,
    cell: ({ row }) =>
      row.original.debt > 0n ? (
        <span className="text-danger">{formatMoney(row.original.debt)}</span>
      ) : (
        '—'
      ),
  },
  {
    accessorKey: 'status',
    header: t.students.cols.status,
    cell: ({ row }) => {
      const s: StudentStatus = row.original.status;
      return <Badge tone={STATUS_TONE[s]}>{t.students.status[s]}</Badge>;
    },
  },
];

interface Props {
  rows: readonly StudentRow[];
  filter: StudentFilter;
  counts: Record<StudentFilter, number>;
  query: string;
  loading?: boolean;
  onFilter: (f: StudentFilter) => void;
  onQuery: (q: string) => void;
  onOpen: (s: StudentRow) => void;
  onNew: () => void;
  /** Cursor sahifalash: keyingi sahifa bor bo'lsa. */
  onLoadMore?: () => void;
}

/** W-05 O'quvchilar (FR-STU-5/6): qidiruv (`oʻ`/`o'` bir xil), filtrlar, jadval. */
export function StudentsView(p: Props) {
  return (
    <>
      <PageHeader
        title={t.students.title}
        actions={
          <Button onClick={p.onNew}>
            <Plus className="size-4" aria-hidden />
            {t.students.new}
          </Button>
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
        items={(Object.keys(t.students.filters) as StudentFilter[]).map((f) => ({
          value: f,
          label: t.students.filters[f],
          count: p.counts[f],
        }))}
      />
      <DataTable
        columns={columns}
        data={p.rows}
        getRowId={(r) => r.id}
        numeric={['debt']}
        loading={p.loading}
        empty={{ title: t.students.empty }}
        onRowClick={p.onOpen}
        onLoadMore={p.onLoadMore}
      />
    </>
  );
}
