import { formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, Card, type ColumnDef, DataTable, PageHeader } from '@lg/ui-web';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { FailedMessageItem, FailedMessageReason } from './types.js';

interface Props {
  messages: readonly FailedMessageItem[];
  onRetry?: (id: string) => void;
  onRetryAll?: () => void;
}

const REASON_TONES: Record<FailedMessageReason, 'danger' | 'warning' | 'muted' | 'info'> = {
  TelegramChatBlocked: 'danger',
  UserNotFound: 'warning',
  NetworkError: 'muted',
  RateLimit: 'info',
};

const columns = (onRetry?: (id: string) => void): ColumnDef<FailedMessageItem, unknown>[] => [
  {
    accessorKey: 'recipientName',
    header: t.failedMessages.cols.recipient,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-text">{row.original.recipientName}</span>
        <span className="text-xs text-text-muted">{formatPhone(row.original.recipientPhone)}</span>
      </div>
    ),
  },
  {
    id: 'student',
    header: t.failedMessages.cols.student,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="text-text">{row.original.studentName}</span>
        <span className="text-xs text-text-muted">{row.original.groupName}</span>
      </div>
    ),
  },
  {
    accessorKey: 'type',
    header: t.failedMessages.cols.type,
    cell: ({ row }) => t.failedMessages.types[row.original.type],
  },
  {
    accessorKey: 'reason',
    header: t.failedMessages.cols.reason,
    cell: ({ row }) => (
      <Badge tone={REASON_TONES[row.original.reason]}>
        {t.failedMessages.reasons[row.original.reason]}
      </Badge>
    ),
  },
  {
    accessorKey: 'attempts',
    header: t.failedMessages.cols.attempts,
  },
  {
    accessorKey: 'date',
    header: t.failedMessages.cols.date,
  },
  {
    id: 'actions',
    header: t.common.actions,
    cell: ({ row }) => (
      <Button
        variant="secondary"
        className="h-8 px-2 text-xs"
        onClick={() => onRetry?.(row.original.id)}
      >
        <RefreshCw className="size-3.5" aria-hidden />
        {t.failedMessages.actions.retry}
      </Button>
    ),
  },
];

/** W-22 Yetib bormagan xabarlar (FR-RPT-6). */
export function FailedMessagesView({ messages, onRetry, onRetryAll }: Props) {
  const blockedCount = messages.filter((m) => m.reason === 'TelegramChatBlocked').length;
  const notFoundCount = messages.filter((m) => m.reason === 'UserNotFound').length;

  return (
    <>
      <PageHeader
        title={t.failedMessages.title}
        description={t.failedMessages.subtitle}
        actions={
          messages.length > 0 && (
            <Button onClick={onRetryAll}>
              <RefreshCw className="size-4" aria-hidden />
              {t.failedMessages.actions.retryAll}
            </Button>
          )
        }
      />

      <div className="mb-4 flex items-center gap-3 rounded-lg border border-warning/30 bg-warning-bg/40 p-3 text-xs text-warning">
        <AlertTriangle className="size-5 shrink-0" aria-hidden />
        <span>{t.failedMessages.banner}</span>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <Card className="p-4">
          <span className="text-xs text-text-muted">{t.failedMessages.kpi.totalFailed}</span>
          <p className="text-xl font-semibold text-danger">{messages.length}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-text-muted">{t.failedMessages.kpi.botBlocked}</span>
          <p className="text-xl font-semibold text-text">{blockedCount}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs text-text-muted">{t.failedMessages.kpi.userNotFound}</span>
          <p className="text-xl font-semibold text-text">{notFoundCount}</p>
        </Card>
      </div>

      <DataTable
        data={messages}
        columns={columns(onRetry)}
        getRowId={(r) => r.id}
        numeric={['attempts']}
        empty={{ title: t.failedMessages.empty }}
      />
    </>
  );
}
