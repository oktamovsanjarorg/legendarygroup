import { webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader, Tabs } from '@lg/ui-web';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';

export interface GroupRow {
  id: string;
  name: string;
  course: string;
  /** `null` — asosiy ustoz biriktirilmagan. */
  teacher: string | null;
  /** `Du/Ch/Ju 15:00`; bo'sh — jadval yo'q. */
  schedule: string;
  /** Bugun yozilganlar; `undefined` — ma'lumot yo'q. */
  size?: number;
  capacity: number;
  status: keyof typeof t.groups.status;
}

export type GroupsFilter = keyof typeof t.groups.filters;

export const GROUP_TONE = {
  forming: 'info',
  active: 'success',
  paused: 'warning',
  finished: 'muted',
} as const;

const muted = (text: string) => <span className="text-text-muted">{text}</span>;

const columns: ColumnDef<GroupRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: t.groups.cols.name,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  { accessorKey: 'course', header: t.groups.cols.course },
  {
    accessorKey: 'teacher',
    header: t.groups.cols.teacher,
    cell: ({ row }) => row.original.teacher ?? muted(t.groups.noTeacher),
  },
  {
    accessorKey: 'schedule',
    header: t.groups.cols.schedule,
    enableSorting: false,
    cell: ({ row }) => row.original.schedule || muted(t.groups.noSchedule),
  },
  {
    id: 'fill',
    accessorFn: (r) => (r.size ?? 0) / r.capacity,
    header: t.groups.cols.fill,
    cell: ({ row: { original: r } }) => (
      <span className={r.size !== undefined && r.size >= r.capacity ? 'text-warning' : ''}>
        {r.size ?? '—'} / {r.capacity}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: t.groups.cols.status,
    cell: ({ row }) => (
      <Badge tone={GROUP_TONE[row.original.status]}>{t.groups.status[row.original.status]}</Badge>
    ),
  },
];

interface Props {
  rows: readonly GroupRow[];
  filter?: GroupsFilter;
  loading?: boolean;
  error?: { message: string; requestId?: string; onRetry: () => void };
  /** `group.manage` yo'q — "Yangi guruh" ko'rinmaydi. */
  onNew?: () => void;
  onFilter?: (f: GroupsFilter) => void;
  onOpen: (g: GroupRow) => void;
  /** O'ng panel (forma yoki tafsilot). */
  children?: ReactNode;
}

const FILTERS = (['current', 'finished', 'all'] as const).map((value) => ({
  value,
  label: t.groups.filters[value],
}));

/** W-10 Guruhlar: ro'yxat + o'ng panelda forma/tafsilot. */
export function GroupsView(p: Props) {
  return (
    <>
      <PageHeader
        title={t.groups.title}
        actions={
          p.onNew && (
            <Button onClick={p.onNew}>
              <Plus className="size-4" aria-hidden />
              {t.groups.new}
            </Button>
          )
        }
      />
      {p.onFilter && (
        <Tabs
          label={t.groups.cols.status}
          value={p.filter ?? 'current'}
          items={FILTERS}
          onChange={p.onFilter}
        />
      )}
      <DataTable
        columns={columns}
        data={p.rows}
        getRowId={(r) => r.id}
        numeric={['fill']}
        loading={p.loading}
        error={p.error}
        empty={{ title: t.groups.empty }}
        onRowClick={p.onOpen}
      />
      {p.children}
    </>
  );
}
