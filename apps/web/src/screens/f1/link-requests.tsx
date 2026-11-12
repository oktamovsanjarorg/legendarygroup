import { formatDateShort, formatPhone, formatTime, webMessages as t } from '@lg/i18n';
import { Badge, Button, type ColumnDef, DataTable, PageHeader } from '@lg/ui-web';

export interface LinkRequest {
  id: string;
  phone: string;
  tgName: string;
  at: Date;
  /** Telefon yoki ism bo'yicha ehtimoliy ota-ona (taklif — inson tasdiqlaydi). */
  match?: string;
}

interface Props {
  rows: readonly LinkRequest[];
  onLink: (r: LinkRequest) => void;
  onReject: (r: LinkRequest) => void;
}

/** W-07 Bog'lanish so'rovlari (FR-AUTH-1): botda raqam ulashgan, bazada topilmagan. */
export function LinkRequestsView({ rows, onLink, onReject }: Props) {
  const columns: ColumnDef<LinkRequest, unknown>[] = [
    {
      id: 'phone',
      header: t.linkRequests.cols.phone,
      enableSorting: false,
      cell: ({ row }) => formatPhone(row.original.phone),
    },
    { accessorKey: 'tgName', header: t.linkRequests.cols.tgName, enableSorting: false },
    {
      id: 'at',
      header: t.linkRequests.cols.at,
      enableSorting: false,
      cell: ({ row }) => `${formatDateShort(row.original.at)} ${formatTime(row.original.at)}`,
    },
    {
      id: 'match',
      header: t.linkRequests.cols.match,
      enableSorting: false,
      cell: ({ row }) =>
        row.original.match ? <Badge tone="info">{row.original.match}</Badge> : '—',
    },
    {
      id: 'actions',
      header: t.common.actions,
      enableSorting: false,
      cell: ({ row }) => (
        <span className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => onReject(row.original)}>
            {t.linkRequests.reject}
          </Button>
          <Button size="sm" onClick={() => onLink(row.original)}>
            {t.linkRequests.link}
          </Button>
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader title={t.linkRequests.title} description={t.linkRequests.hint} />
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(r) => r.id}
        empty={{ title: t.linkRequests.empty }}
      />
    </>
  );
}
