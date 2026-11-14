import { formatDateShort, formatMoney, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader, Tabs } from '@lg/ui-web';
import { Download } from 'lucide-react';

export interface DebtorRow {
  id: string;
  name: string;
  group: string;
  debt: bigint;
  overdueDays: number;
  lastPayment?: Date;
  reminders: number;
  /** BR-22: qarz ≥ 1 oylik narx va ≥ 14 kun — kritik (avtomatik chiqarilmaydi). */
  critical: boolean;
}

export type Bucket = keyof typeof t.debtors.buckets;
const cmp = (a: bigint, b: bigint) => (a < b ? -1 : a > b ? 1 : 0);

const columns: ColumnDef<DebtorRow, unknown>[] = [
  {
    accessorKey: 'name',
    header: t.debtors.cols.name,
    cell: ({ row }) => (
      <span className="flex items-center gap-2 font-medium">
        {row.original.name}
        {row.original.critical && <Badge tone="danger">{t.debtors.critical}</Badge>}
      </span>
    ),
  },
  { accessorKey: 'group', header: t.debtors.cols.group, enableSorting: false },
  {
    id: 'debt',
    accessorFn: (r) => r.debt,
    sortingFn: (a, b) => cmp(a.original.debt, b.original.debt),
    header: t.debtors.cols.debt,
    cell: ({ row }) => <span className="text-danger">{formatMoney(row.original.debt)}</span>,
  },
  {
    id: 'overdue',
    accessorKey: 'overdueDays',
    header: t.debtors.cols.overdue,
    cell: ({ row }) => t.debtors.days.replace('{n}', String(row.original.overdueDays)),
  },
  {
    id: 'lastPayment',
    header: t.debtors.cols.lastPayment,
    enableSorting: false,
    cell: ({ row }) => (row.original.lastPayment ? formatDateShort(row.original.lastPayment) : '—'),
  },
  { id: 'reminders', accessorKey: 'reminders', header: t.debtors.cols.reminders },
];

interface Props {
  rows: readonly DebtorRow[];
  bucket: Bucket;
  /** Jami — server hisoblaydi (UI pul yig'masi qilmaydi). */
  total: bigint;
  onBucket: (b: Bucket) => void;
  onOpen: (r: DebtorRow) => void;
}

/** W-15 Qarzdorlar (FR-PAY-7, BR-21/22): aging, kritik belgi, eksport. */
export function DebtorsView({ rows, bucket, total, onBucket, onOpen }: Props) {
  return (
    <>
      <PageHeader
        title={t.debtors.title}
        description={t.debtors.total.replace('{amount}', formatMoney(total))}
        actions={
          <Button variant="secondary">
            <Download className="size-4" aria-hidden />
            {t.common.export}
          </Button>
        }
      />
      <Tabs
        label={t.debtors.title}
        value={bucket}
        onChange={onBucket}
        items={(Object.keys(t.debtors.buckets) as Bucket[]).map((b) => ({
          value: b,
          label: t.debtors.buckets[b],
        }))}
      />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        numeric={['debt', 'overdue', 'reminders']}
        empty={{ title: t.debtors.empty }}
        onRowClick={onOpen}
      />
    </>
  );
}
