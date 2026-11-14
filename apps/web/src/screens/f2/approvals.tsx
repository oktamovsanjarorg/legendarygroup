import { formatDateShort, formatTime, miniappMessages as m, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, Drawer, PageHeader } from '@lg/ui-web';

export interface WebApproval {
  id: string;
  type: keyof typeof m.approvals.types;
  requestedBy: string;
  reason: string;
  details: readonly { label: string; value: string }[];
  expiresAt: Date;
}

const when = (d: Date) => `${formatDateShort(d)} ${formatTime(d)}`;

const columns: ColumnDef<WebApproval, unknown>[] = [
  {
    id: 'type',
    header: t.approvalsWeb.cols.type,
    enableSorting: false,
    cell: ({ row }) => <span className="font-medium">{m.approvals.types[row.original.type]}</span>,
  },
  {
    accessorKey: 'requestedBy',
    header: t.approvalsWeb.cols.requestedBy,
    enableSorting: false,
  },
  { accessorKey: 'reason', header: t.approvalsWeb.cols.reason, enableSorting: false },
  {
    id: 'expires',
    header: t.approvalsWeb.cols.expires,
    enableSorting: false,
    cell: ({ row }) => (
      <Badge tone="warning">
        {m.approvals.expires.replace('{time}', when(row.original.expiresAt))}
      </Badge>
    ),
  },
];

interface Props {
  rows: readonly WebApproval[];
  open: WebApproval | null;
  onOpen: (r: WebApproval) => void;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}

/** W-31 Tasdiqlash so'rovlari (02 §5): MS-03 ning web varianti — jadval + o'ng panelda qaror. */
export function WebApprovalsView({ rows, open, onOpen, onClose, onApprove, onReject }: Props) {
  return (
    <>
      <PageHeader title={m.approvals.title} />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        empty={{ title: m.approvals.empty }}
        onRowClick={onOpen}
      />
      <Drawer
        open={open !== null}
        title={open ? m.approvals.types[open.type] : ''}
        closeLabel={t.common.cancel}
        onClose={onClose}
        footer={
          <>
            <Button variant="danger" onClick={onReject}>
              {m.approvals.reject}
            </Button>
            <Button onClick={onApprove}>{m.approvals.approve}</Button>
          </>
        }
      >
        {open && (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
            {open.details.map((d) => (
              <div key={d.label} className="contents">
                <dt className="text-text-muted">{d.label}</dt>
                <dd className="font-medium text-text">{d.value}</dd>
              </div>
            ))}
            <dt className="text-text-muted">{m.approvals.reason}</dt>
            <dd className="text-text">{open.reason}</dd>
          </dl>
        )}
      </Drawer>
    </>
  );
}
