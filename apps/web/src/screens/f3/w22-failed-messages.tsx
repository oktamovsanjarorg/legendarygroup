import { formatDateTime, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, KpiCard, PageHeader } from '@lg/ui-web';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { FailedMessageItem, FailedMessageReason } from './types.js';

const f = t.failedMessages;
type LoadError = { message: string; requestId?: string; onRetry: () => void };

interface Props {
  messages: readonly FailedMessageItem[];
  onRetry?: (id: string) => void;
  onRetryAll?: () => void;
  /** Qayta yuborilayotgan xabar ID'lari. */
  pending?: ReadonlySet<string>;
  /** Natija yoki xato (server matni). */
  message?: { text: string; error: boolean };
  loading?: boolean;
  loadError?: LoadError;
}

const TONES: Record<FailedMessageReason, 'danger' | 'warning' | 'muted'> = {
  blocked: 'danger',
  notLinked: 'warning',
  error: 'muted',
};

const columns = (
  onRetry?: (id: string) => void,
  pending?: ReadonlySet<string>,
): ColumnDef<FailedMessageItem, unknown>[] => [
  { accessorKey: 'recipientName', header: f.cols.recipient },
  { accessorKey: 'type', header: f.cols.type, cell: ({ row }) => f.types[row.original.type] },
  {
    accessorKey: 'reason',
    header: f.cols.reason,
    cell: ({ row }) => (
      <span title={row.original.detail ?? undefined}>
        <Badge tone={TONES[row.original.reason]}>{f.reasons[row.original.reason]}</Badge>
      </span>
    ),
  },
  { accessorKey: 'attempts', header: f.cols.attempts },
  {
    accessorKey: 'date',
    header: f.cols.date,
    cell: ({ row }) => formatDateTime(row.original.date),
  },
  {
    id: 'actions',
    header: t.common.actions,
    cell: ({ row }) =>
      onRetry && row.original.reason !== 'notLinked' ? (
        <Button
          variant="secondary"
          onClick={() => onRetry(row.original.id)}
          loading={pending?.has(row.original.id)}
        >
          <RefreshCw className="size-3.5" aria-hidden />
          {f.actions.retry}
        </Button>
      ) : null,
  },
];

const count = (m: readonly FailedMessageItem[], r: FailedMessageReason) =>
  m.filter((x) => x.reason === r).length;

/** W-22 Yetib bormagan xabarlar (FR-RPT-6, T-109). */
export function FailedMessagesView(p: Props) {
  const retryable = p.messages.some((m) => m.reason !== 'notLinked');
  return (
    <>
      <PageHeader
        title={f.title}
        description={f.subtitle}
        actions={
          p.onRetryAll &&
          retryable && (
            <Button onClick={p.onRetryAll} loading={(p.pending?.size ?? 0) > 0}>
              <RefreshCw className="size-4" aria-hidden />
              {f.actions.retryAll}
            </Button>
          )
        }
      />
      {count(p.messages, 'notLinked') > 0 && (
        <div className="mb-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning-bg/40 p-3 text-xs text-warning">
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          <span>{f.notLinkedHint}</span>
        </div>
      )}
      {p.message && (
        <p
          role={p.message.error ? 'alert' : 'status'}
          className={`mb-4 text-sm ${p.message.error ? 'text-danger' : 'text-success'}`}
        >
          {p.message.text}
        </p>
      )}
      <div className="mb-6 grid grid-cols-3 gap-4">
        <KpiCard label={f.kpi.totalFailed} value={String(p.messages.length)} />
        <KpiCard label={f.kpi.botBlocked} value={String(count(p.messages, 'blocked'))} />
        <KpiCard label={f.kpi.notLinked} value={String(count(p.messages, 'notLinked'))} />
      </div>
      <DataTable
        data={p.messages}
        columns={columns(p.onRetry, p.pending)}
        getRowId={(r) => r.id}
        numeric={['attempts']}
        empty={{ title: f.empty }}
        loading={p.loading}
        error={p.loadError}
      />
    </>
  );
}
