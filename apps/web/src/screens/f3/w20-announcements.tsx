import { formatDateTime, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader } from '@lg/ui-web';
import { Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import type { AnnouncementItem } from './types.js';

const a = t.announcements;
type LoadError = { message: string; requestId?: string; onRetry: () => void };

interface Props {
  announcements: readonly AnnouncementItem[];
  /** Yo'q bo'lsa — "Yangi e'lon" tugmasi ko'rinmaydi. */
  onNew?: () => void;
  /** Ochiq forma (route beradi). */
  form?: ReactNode;
  message?: string;
  loading?: boolean;
  loadError?: LoadError;
}

const columns: ColumnDef<AnnouncementItem, unknown>[] = [
  {
    accessorKey: 'title',
    header: a.cols.title,
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-text">{row.original.title}</span>
        <span className="line-clamp-1 text-xs text-text-muted">{row.original.body}</span>
      </div>
    ),
  },
  {
    accessorKey: 'target',
    header: a.cols.target,
    cell: ({ row }) => (
      <Badge tone="info">{row.original.targetName ?? a.audiences[row.original.target]}</Badge>
    ),
  },
  {
    accessorKey: 'date',
    header: a.cols.date,
    cell: ({ row }) => formatDateTime(row.original.date),
  },
  { accessorKey: 'author', header: a.cols.author },
  { accessorKey: 'total', header: a.cols.recipients },
  {
    id: 'delivery',
    header: a.cols.delivery,
    cell: ({ row }) => (
      <span className="whitespace-nowrap">
        <span className="text-success">{row.original.sent}</span> /{' '}
        <span className="text-danger">{row.original.failed}</span> /{' '}
        <span className="text-text-muted">{row.original.blocked}</span>
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: a.cols.status,
    cell: ({ row }) => (
      <Badge tone={row.original.status === 'failed' ? 'danger' : 'muted'}>
        {a.status[row.original.status]}
      </Badge>
    ),
  },
];

/** W-20 E'lonlar (FR-RPT-5, T-305). */
export function AnnouncementsView(p: Props) {
  return (
    <>
      <PageHeader
        title={a.title}
        description={a.subtitle}
        actions={
          p.onNew && (
            <Button onClick={p.onNew}>
              <Plus className="size-4" aria-hidden />
              {a.new}
            </Button>
          )
        }
      />
      {p.message && (
        <p role="status" className="mb-4 text-sm text-success">
          {p.message}
        </p>
      )}
      <DataTable
        data={p.announcements}
        columns={columns}
        getRowId={(r) => r.id}
        numeric={['total']}
        empty={{ title: a.empty }}
        loading={p.loading}
        error={p.loadError}
      />
      {p.form}
    </>
  );
}
