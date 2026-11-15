import type { PaymentDetail } from '@lg/contracts';
import { formatDateShort, formatMoney, webMessages as t } from '@lg/i18n';
import { type ColumnDef, DataTable } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { errorView } from '../../api/errors.js';
import { SCREEN_METHOD } from '../billing/payment-detail.js';
import { useStudentPayments } from '../billing/use-payment.js';

const d = t.payDetail;

const columns: ColumnDef<PaymentDetail, unknown>[] = [
  { id: 'date', header: d.cols.date, accessorFn: (p) => formatDateShort(new Date(p.paidAt)) },
  { id: 'receipt', header: d.cols.receipt, accessorFn: (p) => p.receiptNumber ?? '—' },
  {
    id: 'amount',
    header: d.cols.amount,
    accessorFn: (p) => p.amount,
    cell: ({ row }) => {
      const a = BigInt(row.original.amount);
      return <span className={a < 0n ? 'text-danger' : undefined}>{formatMoney(a)}</span>;
    },
  },
  {
    id: 'method',
    header: d.cols.method,
    accessorFn: (p) => t.payEntry.methods[SCREEN_METHOD[p.method]],
  },
];

/** W-06 "Cheklar" tabi (T-205): o'quvchi to'lovlari va stornolari → W-17. */
export function ReceiptsTab({ studentId }: { studentId: string }) {
  const navigate = useNavigate();
  const q = useStudentPayments(studentId);
  return (
    <DataTable
      columns={columns}
      data={q.data ?? []}
      getRowId={(p) => p.id}
      numeric={['amount']}
      loading={q.isPending}
      error={q.isError ? errorView(q.error, () => void q.refetch()) : undefined}
      empty={{ title: d.receiptsEmpty }}
      onRowClick={(p) => void navigate({ to: '/payments/$id', params: { id: p.id } })}
    />
  );
}
