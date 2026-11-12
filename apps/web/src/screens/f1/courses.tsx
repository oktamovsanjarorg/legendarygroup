import { formatMoney, webMessages as t } from '@lg/i18n';
import { Button, type ColumnDef, DataTable, PageHeader, Tabs } from '@lg/ui-web';
import { Plus } from 'lucide-react';

export interface Course {
  id: string;
  name: string;
  price: bigint;
  months: number;
  groups: number;
}

export interface Room {
  id: string;
  name: string;
  capacity: number;
  groups: number;
}

export type CoursesTab = 'courses' | 'rooms';

const courseCols: ColumnDef<Course, unknown>[] = [
  { accessorKey: 'name', header: t.courses.cols.name },
  { id: 'price', header: t.courses.cols.price, cell: ({ row }) => formatMoney(row.original.price) },
  {
    id: 'duration',
    header: t.courses.cols.duration,
    cell: ({ row }) => t.courses.months.replace('{n}', String(row.original.months)),
  },
  { accessorKey: 'groups', header: t.courses.cols.groups },
];
const roomCols: ColumnDef<Room, unknown>[] = [
  { accessorKey: 'name', header: t.courses.cols.name },
  {
    id: 'capacity',
    header: t.courses.cols.capacity,
    cell: ({ row }) => t.courses.seats.replace('{n}', String(row.original.capacity)),
  },
  { accessorKey: 'groups', header: t.courses.cols.groups },
];

interface Props {
  tab: CoursesTab;
  courses: readonly Course[];
  rooms: readonly Room[];
  onTab: (tab: CoursesTab) => void;
  onAdd: () => void;
}

/** W-09 Kurslar va xonalar (FR-ORG-1/2). */
export function CoursesView({ tab, courses, rooms, onTab, onAdd }: Props) {
  return (
    <>
      <PageHeader
        title={t.courses.title}
        actions={
          <Button onClick={onAdd}>
            <Plus className="size-4" aria-hidden />
            {t.common.add}
          </Button>
        }
      />
      <Tabs
        label={t.courses.title}
        value={tab}
        onChange={onTab}
        items={[
          { value: 'courses', label: t.courses.courses, count: courses.length },
          { value: 'rooms', label: t.courses.rooms, count: rooms.length },
        ]}
      />
      {tab === 'courses' ? (
        <DataTable
          columns={courseCols}
          data={courses}
          getRowId={(r) => r.id}
          numeric={['price', 'groups']}
          empty={{ title: '—' }}
        />
      ) : (
        <DataTable
          columns={roomCols}
          data={rooms}
          getRowId={(r) => r.id}
          numeric={['groups']}
          empty={{ title: '—' }}
        />
      )}
    </>
  );
}
