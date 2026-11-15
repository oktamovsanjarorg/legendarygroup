import { formatDateShort, formatMoney, miniappMessages as t } from '@lg/i18n';
import { ListItem, Section, StatusChip, useMainButton } from '@lg/ui-tg';
import type { PaymentRow } from './payments.js';

const p = t.payments;

export interface Receipt {
  number: string;
  amount: bigint;
  date: Date;
  method: PaymentRow['method'];
  cancelled: boolean;
  cancelReason: string | null;
}

/** MG-05a Chek (FR-PAY-8): rekvizitlar + PDF (MainButton). */
export function ReceiptView({
  r,
  onPdf,
  pdfLoading,
}: {
  r: Receipt;
  onPdf: () => void;
  pdfLoading?: boolean;
}) {
  useMainButton({ text: p.receiptPdf, onClick: onPdf, loading: pdfLoading });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="flex items-center justify-between px-2">
        <h1 className="text-xl font-semibold text-text">{p.receiptTitle}</h1>
        <StatusChip tone={r.cancelled ? 'danger' : 'success'}>
          {r.cancelled ? p.receiptCancelled : p.receiptValid}
        </StatusChip>
      </header>
      <Section>
        <ListItem title={p.receiptNumber} subtitle={r.number} />
        <ListItem title={p.receiptAmount} subtitle={formatMoney(r.amount)} />
        <ListItem title={p.receiptDate} subtitle={formatDateShort(r.date)} />
        <ListItem title={p.receiptMethod} subtitle={p.methods[r.method]} />
        {r.cancelled && r.cancelReason && (
          <ListItem title={p.receiptCancelled} subtitle={r.cancelReason} />
        )}
      </Section>
    </main>
  );
}
