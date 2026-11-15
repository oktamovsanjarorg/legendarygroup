import { formatMoney, formatPeriod, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, KpiCard, PageHeader } from '@lg/ui-web';
import { UserRound } from 'lucide-react';
import type { ChurnStudentItem, ForecastMonth, OccupancyItem } from './types.js';

const f = t.forecasts;
const pct = new Intl.NumberFormat('uz', { maximumFractionDigits: 1 });
const points = (n: number) => f.points.replace('{n}', String(n));

type LoadError = { message: string; requestId?: string; onRetry: () => void };
export interface Section<T> {
  rows: readonly T[];
  loading?: boolean;
  error?: LoadError;
}

interface Props {
  /** `null` — `finance.view` yo'q (tushum ko'rsatilmaydi). */
  revenue: Section<ForecastMonth> | null;
  churn: Section<ChurnStudentItem> & { total: number | null };
  occupancy: Section<OccupancyItem>;
  onOpenStudent?: (id: string) => void;
}

const money = (k: 'lower' | 'expected' | 'upper') => ({
  accessorKey: k,
  header: f.revenueCols[k],
  cell: ({ row }: { row: { original: ForecastMonth } }) => formatMoney(row.original[k]),
});

const revenueColumns: ColumnDef<ForecastMonth, unknown>[] = [
  {
    accessorKey: 'month',
    header: f.revenueCols.month,
    cell: ({ row }) => formatPeriod(row.original.month),
  },
  money('lower'),
  money('expected'),
  money('upper'),
];

const churnColumns = (onOpen?: (id: string) => void): ColumnDef<ChurnStudentItem, unknown>[] => [
  { accessorKey: 'name', header: f.cols.student },
  { accessorKey: 'group', header: f.cols.group, cell: ({ row }) => row.original.group ?? '—' },
  {
    accessorKey: 'riskScore',
    header: f.cols.riskScore,
    cell: ({ row }) => (
      <Badge tone={row.original.riskScore >= 80 ? 'danger' : 'warning'}>
        {points(row.original.riskScore)}
      </Badge>
    ),
  },
  {
    id: 'reasons',
    header: f.cols.reasons,
    cell: ({ row }) => (
      <ul className="space-y-0.5 text-xs text-text">
        {row.original.factors.map((x) => (
          <li key={x.factor}>
            {f.factors[x.factor]} · {points(x.score)}
          </li>
        ))}
      </ul>
    ),
  },
  {
    id: 'action',
    header: f.cols.action,
    cell: ({ row }) =>
      onOpen && (
        <Button variant="secondary" onClick={() => onOpen(row.original.id)}>
          <UserRound className="size-4" aria-hidden />
          {f.actions.openStudent}
        </Button>
      ),
  },
];

const occupancyColumns: ColumnDef<OccupancyItem, unknown>[] = [
  { accessorKey: 'group', header: f.occupancyCols.group },
  { accessorKey: 'capacity', header: f.occupancyCols.capacity },
  { accessorKey: 'active', header: f.occupancyCols.active },
  {
    accessorKey: 'occupancyPercent',
    header: f.occupancyCols.occupancy,
    cell: ({ row }) => `${pct.format(row.original.occupancyPercent)}%`,
  },
  { accessorKey: 'projectedChurn', header: f.occupancyCols.projectedChurn },
  {
    accessorKey: 'projectedPercent',
    header: f.occupancyCols.projected,
    cell: ({ row }) => `${pct.format(row.original.projectedPercent)}%`,
  },
];

function Heading({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-3 mt-6">
      <h3 className="font-semibold text-text">{title}</h3>
      {hint && <p className="text-xs text-text-muted">{hint}</p>}
    </div>
  );
}

/** W-27 Prognozlar (FR-DASH-3, BR-36): server modeli; UI faqat ko'rsatadi. */
export function ForecastsView({ revenue, churn, occupancy, onOpenStudent }: Props) {
  return (
    <>
      <PageHeader title={f.title} description={f.subtitle} />
      <div className="grid grid-cols-2 gap-4">
        <KpiCard
          label={f.kpi.atRiskCount}
          value={churn.loading ? '—' : String(churn.rows.length)}
        />
        <KpiCard
          label={f.kpi.totalStudents}
          value={churn.total === null ? '—' : String(churn.total)}
        />
      </div>
      {revenue && (
        <>
          <Heading title={f.revenueTitle} />
          <DataTable
            data={revenue.rows}
            columns={revenueColumns}
            getRowId={(r) => r.month}
            numeric={['lower', 'expected', 'upper']}
            empty={{ title: t.reports.empty }}
            loading={revenue.loading}
            error={revenue.error}
          />
        </>
      )}
      <Heading title={f.churnTitle} hint={f.churnSubtitle} />
      <DataTable
        data={churn.rows}
        columns={churnColumns(onOpenStudent)}
        getRowId={(r) => r.id}
        numeric={['riskScore']}
        empty={{ title: f.empty }}
        loading={churn.loading}
        error={churn.error}
      />
      <Heading title={f.occupancyTitle} />
      <DataTable
        data={occupancy.rows}
        columns={occupancyColumns}
        getRowId={(r) => r.id}
        numeric={['capacity', 'active', 'occupancyPercent', 'projectedChurn', 'projectedPercent']}
        empty={{ title: f.emptyOccupancy }}
        loading={occupancy.loading}
        error={occupancy.error}
      />
    </>
  );
}
