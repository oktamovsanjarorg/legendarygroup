import { formatMoney, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, Card, type ColumnDef, DataTable, PageHeader } from '@lg/ui-web';
import { AlertTriangle, PhoneCall, Sparkles } from 'lucide-react';
import type { ChurnStudentItem, ForecastRevenue } from './types.js';

interface Props {
  forecast: ForecastRevenue;
  churnStudents: readonly ChurnStudentItem[];
  potentialLoss?: bigint;
  onContactGuardian?: (student: ChurnStudentItem) => void;
}

const columns = (
  onContact?: (student: ChurnStudentItem) => void,
): ColumnDef<ChurnStudentItem, unknown>[] => [
  {
    accessorKey: 'name',
    header: t.forecasts.cols.student,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-text">{row.original.name}</span>
        <span className="text-xs text-text-muted">{row.original.group}</span>
      </div>
    ),
  },
  {
    accessorKey: 'riskScore',
    header: t.forecasts.cols.riskScore,
    cell: ({ row }) => (
      <Badge tone={row.original.riskScore >= 80 ? 'danger' : 'warning'}>
        {row.original.riskScore} ball
      </Badge>
    ),
  },
  {
    id: 'reasons',
    header: t.forecasts.cols.reasons,
    cell: ({ row }) => (
      <ul className="list-disc pl-4 text-xs text-text space-y-0.5">
        {row.original.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
    ),
  },
  {
    id: 'guardian',
    header: t.forecasts.cols.guardian,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-text">{row.original.guardianName}</span>
        <span className="text-xs text-text-muted">{formatPhone(row.original.guardianPhone)}</span>
      </div>
    ),
  },
  {
    id: 'actions',
    header: t.forecasts.cols.action,
    cell: ({ row }) => (
      <Button
        variant="secondary"
        className="h-8 px-2 text-xs"
        onClick={() => onContact?.(row.original)}
      >
        <PhoneCall className="size-3.5" aria-hidden />
        {t.forecasts.actions.callGuardian}
      </Button>
    ),
  },
];

/** W-27 Prognozlar (FR-DASH-3, BR-36). */
export function ForecastsView({
  forecast,
  churnStudents,
  potentialLoss = 1_200_000n,
  onContactGuardian,
}: Props) {
  return (
    <>
      <PageHeader title={t.forecasts.title} description={t.forecasts.subtitle} />

      {/* Revenue Forecast Range */}
      <div className="mb-6">
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden />
          <h3 className="font-semibold text-text">{t.forecasts.nextMonthRevenue}</h3>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4 border-l-4 border-l-warning">
            <span className="text-xs text-text-muted">{t.forecasts.ranges.conservative}</span>
            <p className="mt-1 text-xl font-bold text-text">{formatMoney(forecast.conservative)}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-primary bg-primary/5">
            <span className="text-xs font-medium text-primary">{t.forecasts.ranges.expected}</span>
            <p className="mt-1 text-2xl font-bold text-primary">{formatMoney(forecast.expected)}</p>
          </Card>
          <Card className="p-4 border-l-4 border-l-success">
            <span className="text-xs text-text-muted">{t.forecasts.ranges.optimistic}</span>
            <p className="mt-1 text-xl font-bold text-success">
              {formatMoney(forecast.optimistic)}
            </p>
          </Card>
        </div>
      </div>

      {/* Churn Risk Section */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-semibold text-text">{t.forecasts.churnTitle}</h3>
            <p className="text-xs text-text-muted">{t.forecasts.churnSubtitle}</p>
          </div>
          <div className="flex gap-4 text-xs">
            <span className="flex items-center gap-1.5 font-medium text-danger">
              <AlertTriangle className="size-4" aria-hidden />
              {t.forecasts.kpi.atRiskCount}: {churnStudents.length} ta
            </span>
            <span className="font-medium text-text">
              {t.forecasts.kpi.potentialLoss}: {formatMoney(potentialLoss)}
            </span>
          </div>
        </div>

        <DataTable
          data={churnStudents}
          columns={columns(onContactGuardian)}
          getRowId={(r) => r.id}
          numeric={['riskScore']}
          empty={{ title: t.forecasts.empty }}
        />
      </div>
    </>
  );
}
