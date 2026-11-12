import { formatDateShort, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader } from '@lg/ui-web';
import { UserPlus } from 'lucide-react';

export interface StaffRow {
  id: string;
  name: string;
  phone: string;
  role: keyof typeof t.roles;
  status: keyof typeof t.staff.status;
  lastLogin?: Date;
  /** 02 §4 override soni. */
  overrides: number;
}

const TONE = { active: 'success', invited: 'info', blocked: 'danger' } as const;

const columns: ColumnDef<StaffRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: t.staff.cols.name,
    cell: ({ row }) => (
      <span className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        {row.original.overrides > 0 && (
          <span className="text-xs text-text-muted">
            {t.staff.overrides.replace('{n}', String(row.original.overrides))}
          </span>
        )}
      </span>
    ),
  },
  {
    id: 'phone',
    header: t.staff.cols.phone,
    enableSorting: false,
    cell: ({ row }) => formatPhone(row.original.phone),
  },
  { accessorKey: 'role', header: t.staff.cols.role, cell: ({ row }) => t.roles[row.original.role] },
  {
    accessorKey: 'status',
    header: t.staff.cols.status,
    cell: ({ row }) => (
      <Badge tone={TONE[row.original.status]}>{t.staff.status[row.original.status]}</Badge>
    ),
  },
  {
    id: 'lastLogin',
    header: t.staff.cols.lastLogin,
    enableSorting: false,
    cell: ({ row }) => (row.original.lastLogin ? formatDateShort(row.original.lastLogin) : '—'),
  },
];

/** W-28 Xodimlar (T-101): taklif, bloklash, rol, ruxsat override (02 §4). */
export function StaffView({
  rows,
  onInvite,
  onOpen,
}: {
  rows: readonly StaffRow[];
  onInvite: () => void;
  onOpen: (s: StaffRow) => void;
}) {
  return (
    <>
      <PageHeader
        title={t.staff.title}
        actions={
          <Button onClick={onInvite}>
            <UserPlus className="size-4" aria-hidden />
            {t.staff.invite}
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        empty={{ title: '—' }}
        onRowClick={onOpen}
      />
    </>
  );
}
