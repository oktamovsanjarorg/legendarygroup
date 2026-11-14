import { webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader } from '@lg/ui-web';
import { BadgePercent, Info } from 'lucide-react';

export interface DiscountRow {
  id: string;
  student: string;
  kind: keyof typeof t.discounts.kinds;
  /** Ko'rsatish uchun tayyor qiymat ("10%" yoki "100 000 soʻm") — server formatlaydi/i18n. */
  value: string;
  reason: string;
  by: string;
  status: keyof typeof t.discounts.status;
}

const TONE = { active: 'success', pending: 'warning', expired: 'muted' } as const;

const columns: ColumnDef<DiscountRow, unknown>[] = [
  { accessorKey: 'student', header: t.discounts.cols.student },
  {
    id: 'kind',
    header: t.discounts.cols.kind,
    enableSorting: false,
    cell: ({ row }) => t.discounts.kinds[row.original.kind],
  },
  { accessorKey: 'value', header: t.discounts.cols.value, enableSorting: false },
  { accessorKey: 'reason', header: t.discounts.cols.reason, enableSorting: false },
  { accessorKey: 'by', header: t.discounts.cols.by, enableSorting: false },
  {
    accessorKey: 'status',
    header: t.discounts.cols.status,
    cell: ({ row }) => (
      <Badge tone={TONE[row.original.status]}>{t.discounts.status[row.original.status]}</Badge>
    ),
  },
];

/** W-18 Chegirmalar (BR-18): limitdan yuqori — Direktorga so'rov (T-119). */
export function DiscountsView({
  rows,
  adminLimit,
  onGrant,
}: {
  rows: readonly DiscountRow[];
  adminLimit: number;
  onGrant: () => void;
}) {
  return (
    <>
      <PageHeader
        title={t.discounts.title}
        actions={
          <Button onClick={onGrant}>
            <BadgePercent className="size-4" aria-hidden />
            {t.discounts.grant}
          </Button>
        }
      />
      <p className="mb-4 flex items-start gap-2 text-sm text-text-muted">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          {t.discounts.limitNote.replace('{n}', String(adminLimit))} {t.discounts.biggestWins}
        </span>
      </p>
      <DataTable columns={columns} data={rows} getRowId={(r) => r.id} empty={{ title: '—' }} />
    </>
  );
}
