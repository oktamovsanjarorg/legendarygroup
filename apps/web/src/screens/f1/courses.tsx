import { formatMoney, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader, Tabs } from '@lg/ui-web';
import { Plus } from 'lucide-react';

export interface Course {
  id: string;
  name: string;
  price: bigint;
  /** `null` — cheklanmagan. */
  months: number | null;
  /** Joriy guruhlar soni; `undefined` — ma'lumot yo'q. */
  groups?: number;
  archived?: boolean;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  groups?: number;
  archived?: boolean;
}

export type CoursesTab = 'courses' | 'rooms';

function NameCell({ name, archived }: { name: string; archived?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      {name}
      {archived && <Badge tone="muted">{t.common.archived}</Badge>}
    </span>
  );
}

const groupsCol = <T extends { groups?: number }>(): ColumnDef<T, unknown> => ({
  id: 'groups',
  header: t.courses.cols.groups,
  enableSorting: false,
  cell: ({ row }) => row.original.groups ?? '—',
});

const courseCols: ColumnDef<Course, unknown>[] = [
  {
    accessorKey: 'name',
    header: t.courses.cols.name,
    cell: ({ row }) => <NameCell {...row.original} />,
  },
  { id: 'price', header: t.courses.cols.price, cell: ({ row }) => formatMoney(row.original.price) },
  {
    id: 'duration',
    header: t.courses.cols.duration,
    cell: ({ row }) =>
      row.original.months === null
        ? t.courses.unlimited
        : t.courses.months.replace('{n}', String(row.original.months)),
  },
  groupsCol<Course>(),
];
const roomCols: ColumnDef<Room, unknown>[] = [
  {
    accessorKey: 'name',
    header: t.courses.cols.name,
    cell: ({ row }) => <NameCell {...row.original} />,
  },
  {
    id: 'capacity',
    header: t.courses.cols.capacity,
    cell: ({ row }) => t.courses.seats.replace('{n}', String(row.original.capacity)),
  },
  groupsCol<Room>(),
];

interface Props {
  tab: CoursesTab;
  courses: readonly Course[];
  rooms: readonly Room[];
  /** Arxivdagilar ko'rsatilyaptimi (FR-ORG-1/2: arxivlash). */
  archived?: boolean;
  loading?: boolean;
  error?: { message: string; requestId?: string; onRetry: () => void };
  onTab: (tab: CoursesTab) => void;
  onAdd: () => void;
  onArchived?: (archived: boolean) => void;
  onOpen?: (id: string) => void;
}

/** W-09 Kurslar va xonalar (FR-ORG-1/2). */
export function CoursesView(p: Props) {
  const open = p.onOpen;
  const onRowClick = open ? (r: { id: string }) => open(r.id) : undefined;
  const empty = { title: p.archived ? t.courses.empty.archived : t.courses.empty[p.tab] };
  const shared = { getRowId: (r: { id: string }) => r.id, loading: p.loading, error: p.error };
  return (
    <>
      <PageHeader
        title={t.courses.title}
        actions={
          <Button onClick={p.onAdd}>
            <Plus className="size-4" aria-hidden />
            {t.common.add}
          </Button>
        }
      />
      <Tabs
        label={t.courses.title}
        value={p.tab}
        onChange={p.onTab}
        items={[
          { value: 'courses', label: t.courses.courses, count: p.courses.length },
          { value: 'rooms', label: t.courses.rooms, count: p.rooms.length },
        ]}
      />
      {p.onArchived && (
        <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-text">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={p.archived ?? false}
            onChange={(e) => p.onArchived?.(e.target.checked)}
          />
          {t.common.showArchived}
        </label>
      )}
      {p.tab === 'courses' ? (
        <DataTable
          {...shared}
          columns={courseCols}
          data={p.courses}
          numeric={['price', 'groups']}
          empty={empty}
          onRowClick={onRowClick}
        />
      ) : (
        <DataTable
          {...shared}
          columns={roomCols}
          data={p.rooms}
          numeric={['groups']}
          empty={empty}
          onRowClick={onRowClick}
        />
      )}
    </>
  );
}
