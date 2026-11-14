import { formatMoney, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, Drawer, KpiCard, PageHeader } from '@lg/ui-web';
import { Check, CheckCircle2, ChevronRight, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { MOCK_PAYROLL_TOTAL } from './mock-finance.js';
import type { PayrollContractType, PayrollItem, PayrollStatus } from './types.js';

interface Props {
  items: readonly PayrollItem[];
  total?: bigint;
  advancesTotal?: bigint;
  onApproveAll?: () => void;
  onApproveItem?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
}

const compareBigint = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);

const STATUS_TONES: Record<PayrollStatus, 'warning' | 'info' | 'success'> = {
  draft: 'warning',
  approved: 'info',
  paid: 'success',
};

const CONTRACT_NAMES: Record<PayrollContractType, string> = {
  fixed: 'Fiks',
  percent: 'Foiz',
  mixed: 'Aralash',
  hourly: 'Soatbay',
};

function PayrollDrawerStats({ lessons, students }: { lessons: number; students: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-md border border-border p-2.5">
        <span className="text-xs text-text-muted">{t.payroll.drawer.lessonsCount}</span>
        <p className="text-lg font-semibold text-text">{lessons}</p>
      </div>
      <div className="rounded-md border border-border p-2.5">
        <span className="text-xs text-text-muted">{t.payroll.drawer.studentsCount}</span>
        <p className="text-lg font-semibold text-text">{students}</p>
      </div>
    </div>
  );
}

function PayrollBreakdownList({
  breakdowns,
}: {
  breakdowns: readonly { group: string; amount: bigint }[];
}) {
  if (breakdowns.length === 0) return null;
  return (
    <div className="rounded-md border border-border p-3">
      <h5 className="font-medium text-text mb-2">{t.payroll.drawer.breakdownTitle}</h5>
      <div className="space-y-1.5">
        {breakdowns.map((g) => (
          <div
            key={g.group}
            className="flex justify-between text-xs border-b border-border/40 py-1"
          >
            <span>{g.group}</span>
            <span className="font-semibold">{formatMoney(g.amount)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PayrollDrawerDetails({
  item,
  onApprove,
  onMarkPaid,
}: {
  item: PayrollItem;
  onApprove?: (id: string) => void;
  onMarkPaid?: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div className="rounded-lg border border-border bg-surface p-3">
        <h4 className="font-semibold text-text">{item.staffName}</h4>
        <p className="text-xs text-text-muted">{item.role}</p>
        <p className="mt-1 text-xs font-medium text-primary">{item.details.formula}</p>
      </div>

      <PayrollDrawerStats
        lessons={item.details.lessonsCount}
        students={item.details.studentsCount}
      />
      <PayrollBreakdownList breakdowns={item.details.groupBreakdowns} />

      <div className="rounded-md border border-border p-3 space-y-1.5 text-xs">
        <div className="flex justify-between">
          <span className="text-text-muted">{t.payroll.cols.baseAmount}:</span>
          <span className="font-medium">{formatMoney(item.baseAmount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">{t.payroll.cols.bonus}:</span>
          <span className="font-medium text-success">+{formatMoney(item.bonus)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-text-muted">{t.payroll.cols.advance}:</span>
          <span className="font-medium text-danger">−{formatMoney(item.advance)}</span>
        </div>
        <div className="flex justify-between border-t border-border pt-1.5 text-sm font-semibold">
          <span>{t.payroll.drawer.totalToPay}:</span>
          <span className="text-primary">{formatMoney(item.total)}</span>
        </div>
      </div>

      <div className="flex gap-2 mt-2">
        {item.status === 'draft' && (
          <Button className="flex-1" onClick={() => onApprove?.(item.id)}>
            <Check className="size-4" aria-hidden />
            {t.payroll.actions.approve}
          </Button>
        )}
        {item.status === 'approved' && (
          <Button className="flex-1" onClick={() => onMarkPaid?.(item.id)}>
            <CheckCircle2 className="size-4" aria-hidden />
            {t.payroll.actions.markPaid}
          </Button>
        )}
      </div>
    </div>
  );
}

const basePayrollColumns: ColumnDef<PayrollItem, unknown>[] = [
  {
    accessorKey: 'staffName',
    header: t.payroll.cols.staff,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-text">{row.original.staffName}</span>
        <span className="text-xs text-text-muted">{row.original.role}</span>
      </div>
    ),
  },
  {
    accessorKey: 'contractType',
    header: t.payroll.cols.contract,
    cell: ({ row }) => <Badge tone="muted">{CONTRACT_NAMES[row.original.contractType]}</Badge>,
  },
  {
    accessorKey: 'baseAmount',
    header: t.payroll.cols.baseAmount,
    sortingFn: (a, b) => compareBigint(a.original.baseAmount, b.original.baseAmount),
    cell: ({ row }) => formatMoney(row.original.baseAmount),
  },
  {
    accessorKey: 'bonus',
    header: t.payroll.cols.bonus,
    sortingFn: (a, b) => compareBigint(a.original.bonus, b.original.bonus),
    cell: ({ row }) =>
      row.original.bonus > 0n ? (
        <span className="text-success">+{formatMoney(row.original.bonus)}</span>
      ) : (
        '—'
      ),
  },
  {
    accessorKey: 'advance',
    header: t.payroll.cols.advance,
    sortingFn: (a, b) => compareBigint(a.original.advance, b.original.advance),
    cell: ({ row }) =>
      row.original.advance > 0n ? (
        <span className="text-danger">−{formatMoney(row.original.advance)}</span>
      ) : (
        '—'
      ),
  },
  {
    accessorKey: 'total',
    header: t.payroll.cols.total,
    sortingFn: (a, b) => compareBigint(a.original.total, b.original.total),
    cell: ({ row }) => (
      <span className="font-semibold text-text">{formatMoney(row.original.total)}</span>
    ),
  },
  {
    accessorKey: 'status',
    header: t.payroll.cols.status,
    cell: ({ row }) => (
      <Badge tone={STATUS_TONES[row.original.status]}>
        {t.payroll.status[row.original.status]}
      </Badge>
    ),
  },
];

function createPayrollColumns(
  onOpenDetails: (item: PayrollItem) => void,
): ColumnDef<PayrollItem, unknown>[] {
  return [
    ...basePayrollColumns,
    {
      id: 'actions',
      header: t.common.actions,
      cell: ({ row }) => (
        <Button
          variant="secondary"
          className="h-8 px-2 text-xs"
          onClick={() => onOpenDetails(row.original)}
        >
          {t.payroll.actions.details}
          <ChevronRight className="size-3.5" aria-hidden />
        </Button>
      ),
    },
  ];
}

function PayrollKpis({
  total,
  approvedCount,
  totalCount,
  advancesTotal,
}: {
  total: bigint;
  approvedCount: number;
  totalCount: number;
  advancesTotal: bigint;
}) {
  return (
    <div className="mb-6 grid grid-cols-4 gap-4">
      <KpiCard label={t.payroll.kpi.totalCalculated} value={formatMoney(total)} />
      <KpiCard label={t.payroll.kpi.approved} value={`${approvedCount} / ${totalCount}`} />
      <KpiCard label={t.payroll.kpi.advances} value={formatMoney(advancesTotal)} />
      <KpiCard label={t.payroll.period} value="2026-yil oktabr" />
    </div>
  );
}

/** W-25 Oyliklar (FR-SAL-1/2/3/5). */
export function PayrollView({
  items,
  total = MOCK_PAYROLL_TOTAL,
  advancesTotal = 4_000_000n,
  onApproveAll,
  onApproveItem,
  onMarkPaid,
}: Props) {
  const [selectedItem, setSelectedItem] = useState<PayrollItem | null>(null);
  const approvedCount = items.filter((i) => i.status === 'approved' || i.status === 'paid').length;

  return (
    <>
      <PageHeader
        title={t.payroll.title}
        description={t.payroll.subtitle}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary">
              <RefreshCw className="size-4" aria-hidden />
              {t.payroll.recalculate}
            </Button>
            <Button onClick={onApproveAll}>
              <Check className="size-4" aria-hidden />
              {t.payroll.approveAll}
            </Button>
          </div>
        }
      />

      <PayrollKpis
        total={total}
        approvedCount={approvedCount}
        totalCount={items.length}
        advancesTotal={advancesTotal}
      />

      <DataTable
        data={items}
        columns={createPayrollColumns(setSelectedItem)}
        getRowId={(r) => r.id}
        numeric={['baseAmount', 'bonus', 'advance', 'total']}
        empty={{ title: t.payroll.empty }}
      />

      <Drawer
        open={Boolean(selectedItem)}
        title={t.payroll.drawer.title}
        closeLabel={t.common.cancel}
        onClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <PayrollDrawerDetails
            item={selectedItem}
            onApprove={onApproveItem}
            onMarkPaid={onMarkPaid}
          />
        )}
      </Drawer>
    </>
  );
}
