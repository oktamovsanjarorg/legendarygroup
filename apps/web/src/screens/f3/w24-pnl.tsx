import { formatMoney, webMessages as t } from '@lg/i18n';
import { Button, Card, type ColumnDef, DataTable, PageHeader } from '@lg/ui-web';
import { Download } from 'lucide-react';
import type { PnlMonthRow } from './types.js';

interface Props {
  months: readonly PnlMonthRow[];
  onExportExcel?: () => void;
}

const compareBigint = (a: bigint, b: bigint): number => (a < b ? -1 : a > b ? 1 : 0);

const columns: ColumnDef<PnlMonthRow, unknown>[] = [
  {
    accessorKey: 'month',
    header: t.pnl.cols.month,
    cell: ({ row }) => <span className="font-semibold text-text">{row.original.month}</span>,
  },
  {
    accessorKey: 'revenue',
    header: t.pnl.cols.revenue,
    sortingFn: (a, b) => compareBigint(a.original.revenue, b.original.revenue),
    cell: ({ row }) => (
      <span className="font-medium text-success">{formatMoney(row.original.revenue)}</span>
    ),
  },
  {
    accessorKey: 'payroll',
    header: t.pnl.cols.payroll,
    sortingFn: (a, b) => compareBigint(a.original.payroll, b.original.payroll),
    cell: ({ row }) => <span className="text-text-muted">{formatMoney(row.original.payroll)}</span>,
  },
  {
    accessorKey: 'operational',
    header: t.pnl.cols.operational,
    sortingFn: (a, b) => compareBigint(a.original.operational, b.original.operational),
    cell: ({ row }) => (
      <span className="text-text-muted">{formatMoney(row.original.operational)}</span>
    ),
  },
  {
    accessorKey: 'totalExpenses',
    header: t.pnl.cols.totalExpenses,
    sortingFn: (a, b) => compareBigint(a.original.totalExpenses, b.original.totalExpenses),
    cell: ({ row }) => (
      <span className="text-danger">{formatMoney(row.original.totalExpenses)}</span>
    ),
  },
  {
    accessorKey: 'netProfit',
    header: t.pnl.cols.netProfit,
    sortingFn: (a, b) => compareBigint(a.original.netProfit, b.original.netProfit),
    cell: ({ row }) => (
      <span className="font-semibold text-success">{formatMoney(row.original.netProfit)}</span>
    ),
  },
  {
    accessorKey: 'marginPercent',
    header: t.pnl.cols.margin,
    cell: ({ row }) => <span className="font-medium">{row.original.marginPercent}%</span>,
  },
];

function PnlComparisonBars({ months }: { months: readonly PnlMonthRow[] }) {
  if (months.length === 0) return null;
  const maxRevenue = months.reduce((max, m) => (m.revenue > max ? m.revenue : max), 1n);

  return (
    <Card className="mb-6 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-medium text-text">{t.pnl.chartTitle}</h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-success" />
            {t.pnl.legend.revenue}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-danger" />
            {t.pnl.legend.expenses}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-primary" />
            {t.pnl.legend.profit}
          </span>
        </div>
      </div>

      <div className="flex items-end justify-around gap-6 pt-6 pb-2 min-h-48 border-b border-border">
        {months.map((m) => {
          const revH = Math.max(0, Math.min(100, Number((m.revenue * 100n) / maxRevenue)));
          const expH = Math.max(0, Math.min(100, Number((m.totalExpenses * 100n) / maxRevenue)));
          const profH =
            m.netProfit > 0n
              ? Math.max(0, Math.min(100, Number((m.netProfit * 100n) / maxRevenue)))
              : 0;

          return (
            <div key={m.month} className="flex flex-col items-center gap-2">
              <div className="flex items-end gap-1.5 h-36">
                <div
                  title={`Tushum: ${formatMoney(m.revenue)}`}
                  style={{ height: `${revH}%` }}
                  className="w-6 rounded-t bg-success/80 transition-all"
                />
                <div
                  title={`Xarajat: ${formatMoney(m.totalExpenses)}`}
                  style={{ height: `${expH}%` }}
                  className="w-6 rounded-t bg-danger/80 transition-all"
                />
                <div
                  title={`Sof foyda: ${formatMoney(m.netProfit)}`}
                  style={{ height: `${profH}%` }}
                  className="w-6 rounded-t bg-primary transition-all"
                />
              </div>
              <span className="text-xs font-medium text-text">{m.month}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** W-24 P&L (FR-FIN-2/3): tushum - xarajat - oylik = foyda. */
export function PnlView({ months, onExportExcel }: Props) {
  const latest = months[months.length - 1];

  return (
    <>
      <PageHeader
        title={t.pnl.title}
        description={t.pnl.subtitle}
        actions={
          <Button variant="secondary" onClick={onExportExcel}>
            <Download className="size-4" aria-hidden />
            {t.pnl.exportExcel}
          </Button>
        }
      />

      {latest && (
        <div className="mb-6 grid grid-cols-4 gap-4">
          <Card className="p-4">
            <span className="text-xs text-text-muted">{t.pnl.kpi.revenue}</span>
            <p className="text-xl font-semibold text-success">{formatMoney(latest.revenue)}</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-text-muted">{t.pnl.kpi.payroll}</span>
            <p className="text-xl font-semibold text-text">{formatMoney(latest.payroll)}</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-text-muted">{t.pnl.kpi.expenses}</span>
            <p className="text-xl font-semibold text-danger">{formatMoney(latest.operational)}</p>
          </Card>
          <Card className="p-4">
            <span className="text-xs text-text-muted">{t.pnl.kpi.netProfit}</span>
            <p className="text-xl font-semibold text-primary">{formatMoney(latest.netProfit)}</p>
          </Card>
        </div>
      )}

      <PnlComparisonBars months={months} />

      <DataTable
        data={months}
        columns={columns}
        getRowId={(r) => r.month}
        numeric={[
          'revenue',
          'payroll',
          'operational',
          'totalExpenses',
          'netProfit',
          'marginPercent',
        ]}
        empty={{ title: t.pnl.empty }}
      />
    </>
  );
}
