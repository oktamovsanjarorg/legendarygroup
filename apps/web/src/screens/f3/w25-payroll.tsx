import { formatMoney, webMessages as t } from '@lg/i18n';
import {
  Badge,
  Button,
  type ColumnDef,
  DataTable,
  Drawer,
  EmptyState,
  KpiCard,
  PageHeader,
} from '@lg/ui-web';
import { Check, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import type { PayrollRow, PayrollStatus } from './types.js';

const p = t.payroll;
const compareBigint = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);
const STATUS_TONES: Record<PayrollStatus, 'warning' | 'info' | 'success'> = {
  draft: 'warning',
  approved: 'info',
  paid: 'success',
};
const money = (k: 'earned' | 'extras' | 'advances' | 'total') => ({
  accessorKey: k,
  sortingFn: (a: { original: PayrollRow }, b: { original: PayrollRow }) =>
    compareBigint(a.original[k], b.original[k]),
});

const columns = (open: (r: PayrollRow) => void): ColumnDef<PayrollRow, unknown>[] => [
  { accessorKey: 'staffName', header: p.cols.staff },
  {
    ...money('earned'),
    header: p.cols.baseAmount,
    cell: ({ row }) => formatMoney(row.original.earned),
  },
  {
    ...money('extras'),
    header: p.cols.bonus,
    cell: ({ row }) => (row.original.extras === 0n ? '—' : formatMoney(row.original.extras)),
  },
  {
    ...money('advances'),
    header: p.cols.advance,
    cell: ({ row }) =>
      row.original.advances > 0n ? (
        <span className="text-danger">−{formatMoney(row.original.advances)}</span>
      ) : (
        '—'
      ),
  },
  {
    ...money('total'),
    header: p.cols.total,
    cell: ({ row }) => <span className="font-semibold">{formatMoney(row.original.total)}</span>,
  },
  {
    id: 'actions',
    header: t.common.actions,
    cell: ({ row }) => (
      <Button size="sm" variant="secondary" onClick={() => open(row.original)}>
        {p.actions.details}
        <ChevronRight className="size-3.5" aria-hidden />
      </Button>
    ),
  },
];

function Lines({ row }: { row: PayrollRow }) {
  return (
    <div className="flex flex-col gap-3 text-sm">
      <ul className="divide-y divide-border rounded-md border border-border">
        {row.lines.map((l, i) => (
          <li key={`${l.kind}-${i}`} className="flex justify-between gap-3 px-3 py-2">
            <span>
              <span className="font-medium text-text">{p.kinds[l.kind]}</span>
              {l.note && <span className="block text-xs text-text-muted">{l.note}</span>}
            </span>
            <span className={l.amount < 0n ? 'tabular-nums text-danger' : 'tabular-nums'}>
              {formatMoney(l.amount)}
            </span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between font-semibold">
        <span>{p.drawer.totalToPay}</span>
        <span className="text-primary">{formatMoney(row.total)}</span>
      </p>
    </div>
  );
}

export interface PayrollActions {
  onGenerate?: () => void;
  onApprove?: () => void;
  onPay?: () => void;
  busy?: boolean;
  error?: string;
}

function HeaderActions({ status, a }: { status: PayrollStatus | null; a: PayrollActions }) {
  return (
    <div className="flex gap-2">
      {(status === null || status === 'draft') && a.onGenerate && (
        <Button variant="secondary" loading={a.busy} onClick={a.onGenerate}>
          <RefreshCw className="size-4" aria-hidden />
          {status === null ? p.actions.generate : p.recalculate}
        </Button>
      )}
      {status === 'draft' && a.onApprove && (
        <Button loading={a.busy} onClick={a.onApprove}>
          <Check className="size-4" aria-hidden />
          {p.approveAll}
        </Button>
      )}
      {status === 'approved' && a.onPay && (
        <Button loading={a.busy} onClick={a.onPay}>
          <CheckCircle2 className="size-4" aria-hidden />
          {p.actions.markPaid}
        </Button>
      )}
    </div>
  );
}

interface Props extends PayrollActions {
  periodLabel: string;
  /** `null` — shu oy hali hisoblanmagan. */
  status: PayrollStatus | null;
  rows: readonly PayrollRow[];
  total: bigint;
}

/** W-25 Oyliklar (FR-SAL-1/2/3/5, BR-27): hisob bir butun — hisoblash, tasdiqlash, to'lash. */
export function PayrollView({ periodLabel, status, rows, total, ...a }: Props) {
  const [open, setOpen] = useState<PayrollRow | null>(null);
  return (
    <>
      <PageHeader
        title={p.title}
        description={p.subtitle}
        help="oylik-hisoblash"
        actions={<HeaderActions status={status} a={a} />}
      />
      {a.error && (
        <p role="alert" className="mb-4 text-sm text-danger">
          {a.error}
        </p>
      )}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <KpiCard label={p.period} value={periodLabel} />
        <KpiCard label={p.kpi.totalCalculated} value={formatMoney(total)} />
        <KpiCard label={p.teachers} value={String(rows.length)} />
        <div className="flex items-center">
          {status && <Badge tone={STATUS_TONES[status]}>{p.status[status]}</Badge>}
        </div>
      </div>
      {status === null ? (
        <EmptyState title={p.empty} hint={p.notGenerated} />
      ) : (
        <DataTable
          data={rows}
          columns={columns(setOpen)}
          getRowId={(r) => r.id}
          numeric={['earned', 'extras', 'advances', 'total']}
          empty={{ title: p.empty }}
        />
      )}
      {status === 'draft' && <p className="mt-3 text-xs text-text-muted">{p.approveHint}</p>}
      <Drawer
        open={open !== null}
        title={open?.staffName ?? p.drawer.title}
        closeLabel={t.common.close}
        onClose={() => setOpen(null)}
      >
        {open && <Lines row={open} />}
      </Drawer>
    </>
  );
}
