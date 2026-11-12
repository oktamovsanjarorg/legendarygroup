import { webMessages as t } from '@lg/i18n';
import {
  Badge,
  Button,
  type ColumnDef,
  DataTable,
  Drawer,
  Field,
  PageHeader,
  SelectField,
} from '@lg/ui-web';
import { AlertTriangle, Plus } from 'lucide-react';

export interface GroupRow {
  id: string;
  name: string;
  course: string;
  teacher: string;
  schedule: string;
  size: number;
  capacity: number;
  status: keyof typeof t.groups.status;
}

const TONE = { forming: 'info', active: 'success', finished: 'muted' } as const;

const columns: ColumnDef<GroupRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: t.groups.cols.name,
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  { accessorKey: 'course', header: t.groups.cols.course },
  { accessorKey: 'teacher', header: t.groups.cols.teacher },
  { accessorKey: 'schedule', header: t.groups.cols.schedule, enableSorting: false },
  {
    id: 'fill',
    accessorFn: (r) => r.size / r.capacity,
    header: t.groups.cols.fill,
    cell: ({ row }) => (
      <span className={row.original.size >= row.original.capacity ? 'text-warning' : ''}>
        {row.original.size} / {row.original.capacity}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: t.groups.cols.status,
    cell: ({ row }) => (
      <Badge tone={TONE[row.original.status]}>{t.groups.status[row.original.status]}</Badge>
    ),
  },
];

const opts = (xs: readonly string[]) => xs.map((x) => ({ value: x, label: x }));

/** Guruh formasi (FR-ORG-3/4/6): xona/ustoz to'qnashuvi saqlashdan oldin ko'rsatiladi. */
function GroupForm({ conflict }: { conflict?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <Field label={t.groups.form.name} defaultValue="IELTS 7.0 — B3-guruh" />
      <SelectField label={t.groups.form.course} options={opts(['Ingliz tili', 'Matematika'])} />
      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label={t.groups.form.teacher}
          options={opts(['Karimov Rustam', 'Saidova Lola'])}
        />
        <SelectField label={t.groups.form.assistant} options={opts(['—', 'Saidova Lola'])} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <SelectField label={t.groups.form.room} options={opts(['204-xona', '305-xona'])} />
        <Field label={t.groups.form.days} defaultValue="Du, Ch, Ju" />
        <Field label={t.groups.form.time} defaultValue="15:00–16:30" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t.groups.form.capacity} type="number" defaultValue={16} />
        <Field label={t.groups.form.startDate} type="date" defaultValue="2026-11-16" />
      </div>
      {conflict && (
        <p role="alert" className="flex gap-2 rounded-md bg-warning-bg p-3 text-sm text-warning">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          {conflict}
        </p>
      )}
    </div>
  );
}

interface Props {
  rows: readonly GroupRow[];
  formOpen: boolean;
  conflict?: string;
  onNew: () => void;
  onClose: () => void;
  onOpen: (g: GroupRow) => void;
}

/** W-10 Guruhlar: ro'yxat + o'ng panelda forma. */
export function GroupsView({ rows, formOpen, conflict, onNew, onClose, onOpen }: Props) {
  return (
    <>
      <PageHeader
        title={t.groups.title}
        actions={
          <Button onClick={onNew}>
            <Plus className="size-4" aria-hidden />
            {t.groups.new}
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        numeric={['fill']}
        empty={{ title: '—' }}
        onRowClick={onOpen}
      />
      <Drawer
        open={formOpen}
        title={t.groups.new}
        closeLabel={t.common.cancel}
        onClose={onClose}
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              {t.common.cancel}
            </Button>
            <Button>{t.common.save}</Button>
          </>
        }
      >
        <GroupForm conflict={conflict} />
      </Drawer>
    </>
  );
}
