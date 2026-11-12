import { formatDateShort, formatMoney, miniappMessages as t } from '@lg/i18n';
import { ListItem, MoneyText, Section, StatusChip, useMainButton } from '@lg/ui-tg';
import { FileText } from 'lucide-react';

export interface Invoice {
  id: string;
  month: string;
  amount: bigint;
  paid: bigint;
  dueDate: Date;
  overdue: boolean;
}

export interface PaymentRow {
  id: string;
  date: Date;
  amount: bigint;
  method: keyof typeof t.payments.methods;
  receiptNo: string;
}

function InvoiceChip({ i }: { i: Invoice }) {
  if (i.paid >= i.amount) return <StatusChip tone="success">{t.payments.paid}</StatusChip>;
  if (i.overdue) return <StatusChip tone="danger">{t.payments.overdue}</StatusChip>;
  if (i.paid > 0n)
    return (
      <StatusChip tone="warning">
        {t.payments.partial.replace('{paid}', formatMoney(i.paid))}
      </StatusChip>
    );
  return <StatusChip tone="muted">{t.payments.unpaid}</StatusChip>;
}

interface Props {
  childName: string;
  /** BR-20: > 0 — qarz. */
  debt: bigint;
  invoices: readonly Invoice[];
  payments: readonly PaymentRow[];
  onPay: () => void;
  onReceipt: (p: PaymentRow) => void;
}

/** MG-05 To'lovlar (FR-PAY-7): balans, hisoblar, tarix + PDF cheklar. */
export function PaymentsView({ childName, debt, invoices, payments, onPay, onReceipt }: Props) {
  useMainButton({ text: t.payments.makePayment, onClick: onPay });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-2xl font-bold text-text">{t.payments.title}</h1>
        <p className="text-sm text-text-muted">{childName}</p>
      </header>
      <div className={`flex flex-col gap-1 rounded-xl p-4 ${debt > 0n ? 'bg-danger-bg' : 'bg-bg'}`}>
        <span className="text-sm text-text-muted">
          {debt > 0n ? t.childHome.debt : t.childHome.balance}
        </span>
        {debt === 0n ? (
          <span className="text-xl font-semibold text-success">{t.childHome.settled}</span>
        ) : (
          <MoneyText amount={-debt} className="text-2xl font-bold" />
        )}
      </div>
      <Section title={t.payments.invoices}>
        {invoices.length === 0 ? (
          <ListItem title={<span className="text-text-muted">{t.payments.empty}</span>} />
        ) : (
          invoices.map((i) => (
            <ListItem
              key={i.id}
              title={i.month}
              subtitle={<InvoiceChip i={i} />}
              after={<MoneyText amount={i.amount} />}
            />
          ))
        )}
      </Section>
      {payments.length > 0 && (
        <Section title={t.payments.history}>
          {payments.map((p) => (
            <ListItem
              key={p.id}
              before={<FileText className="size-5" aria-hidden />}
              title={<MoneyText amount={p.amount} />}
              subtitle={
                <span className="flex flex-col">
                  <span>
                    {formatDateShort(p.date)} · {t.payments.methods[p.method]}
                  </span>
                  <span className="tabular-nums">
                    {t.payments.receipt.replace('{no}', p.receiptNo)}
                  </span>
                </span>
              }
              chevron
              onClick={() => onReceipt(p)}
            />
          ))}
        </Section>
      )}
    </main>
  );
}
