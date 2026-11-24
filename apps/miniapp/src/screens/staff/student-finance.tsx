import type { Invoice, InvoiceWithLines, PaymentMethod } from '@lg/contracts';
import {
  formatDateTime,
  formatMoney,
  formatPeriod,
  formatYmd,
  miniappMessages as t,
} from '@lg/i18n';
import {
  type ChipTone,
  InlineButton,
  ListItem,
  MoneyInput,
  MoneyText,
  Section,
  StatusChip,
  TextArea,
  useMainButton,
} from '@lg/ui-tg';
import { Undo2 } from 'lucide-react';
import { useState } from 'react';
import type { StudentFinance } from '../../data/staff-payments.js';
import { EmptyRow, Fields, Screen } from './form-kit.js';
import { ChoiceSection } from './kit.js';

const c = t.staffFinance;
const TONES: Record<Invoice['status'], ChipTone> = {
  open: 'danger',
  partially_paid: 'warning',
  paid: 'success',
  void: 'muted',
};

function Balance({ f }: { f: StudentFinance }) {
  const debt = BigInt(f.summary.totalDebt);
  const advance = BigInt(f.summary.totalAdvance);
  if (debt === 0n && advance === 0n)
    return <p className="rounded-xl bg-bg p-4 font-semibold text-success">{c.settled}</p>;
  return (
    <div
      className={`flex items-center justify-between rounded-xl p-4 ${debt > 0n ? 'bg-danger-bg' : 'bg-bg'}`}
    >
      <span className="text-sm text-text-muted">{debt > 0n ? c.debt : c.advance}</span>
      <MoneyText amount={debt > 0n ? -debt : advance} className="text-2xl font-bold" />
    </div>
  );
}

/** Oʻquvchi hisobi (T-153): qarz/avans, oylik hisoblar, toʻlovlar. */
export function StudentFinanceView(p: {
  student: string;
  f: StudentFinance;
  onInvoice: (id: string) => void;
  onPayment: (id: string) => void;
  onRefund?: () => void;
}) {
  const { f } = p;
  return (
    <Screen title={c.title} subtitle={p.student}>
      <Balance f={f} />
      {p.onRefund && BigInt(f.summary.totalAdvance) > 0n && (
        <Section>
          <ListItem
            before={<Undo2 className="size-5" aria-hidden />}
            title={c.refund}
            chevron
            onClick={p.onRefund}
          />
        </Section>
      )}
      <Section title={c.invoices}>
        {f.invoices.length === 0 && <EmptyRow text={c.noInvoices} />}
        {f.invoices.map((i) => (
          <ListItem
            key={i.id}
            title={formatPeriod(i.period)}
            subtitle={formatMoney(BigInt(i.total))}
            after={<StatusChip tone={TONES[i.status]}>{c.statuses[i.status]}</StatusChip>}
            chevron
            onClick={() => p.onInvoice(i.id)}
          />
        ))}
      </Section>
      <Section title={c.payments}>
        {f.payments.length === 0 && <EmptyRow text={c.noPayments} />}
        {f.payments.map((x) => (
          <ListItem
            key={x.id}
            title={<MoneyText amount={BigInt(x.amount)} />}
            subtitle={[
              formatDateTime(new Date(x.paidAt)),
              t.staffPay.methods[x.method],
              x.receiptNumber,
            ]
              .filter(Boolean)
              .join(' · ')}
            chevron
            onClick={() => p.onPayment(x.id)}
          />
        ))}
      </Section>
    </Screen>
  );
}

/** Oylik hisob qatorlari; jarimani bekor qilish (BR-8). */
export function InvoiceView(p: {
  invoice: InvoiceWithLines;
  /** `penalty.waive`. */
  onWaive?: (lineId: string) => void;
}) {
  const { invoice: i } = p;
  return (
    <Screen
      title={formatPeriod(i.period)}
      subtitle={c.dueDate.replace('{date}', formatYmd(i.dueDate))}
    >
      <Section title={c.lines}>
        {i.lines.map((l) => {
          const waive = p.onWaive && l.kind === 'penalty' && BigInt(l.amount) > 0n;
          return (
            <ListItem
              key={l.id}
              title={l.description}
              subtitle={waive ? <span className="text-link">{c.waive}</span> : undefined}
              after={<MoneyText amount={BigInt(l.amount)} />}
              onClick={waive ? () => p.onWaive?.(l.id) : undefined}
            />
          );
        })}
        <ListItem
          title={<span className="font-semibold">{c.total}</span>}
          after={
            <span className="flex items-center gap-2">
              <MoneyText amount={BigInt(i.total)} className="font-semibold" />
              <StatusChip tone={TONES[i.status]}>{c.statuses[i.status]}</StatusChip>
            </span>
          }
        />
      </Section>
    </Screen>
  );
}

const METHODS = ['cash', 'card', 'bank', 'other'] as const satisfies readonly PaymentMethod[];

export interface RefundViewProps {
  student: string;
  advance: bigint;
  /** Director — darhol; aks holda soʻrov. */
  direct: boolean;
  saving: boolean;
  onSave: (v: { amount: bigint; method: PaymentMethod; reason: string }) => void;
}

/** Avansni qaytarish (BR-17, FR-PAY-6). */
export function RefundView(p: RefundViewProps) {
  const [amount, setAmount] = useState<bigint | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reason, setReason] = useState('');
  const valid = amount !== null && amount <= p.advance && reason.trim().length >= 3;
  const direct = c.refundSave.replace('{amount}', amount ? formatMoney(amount) : '');
  useMainButton({
    text: p.direct ? direct : t.staffPayments.sendRequest,
    disabled: !valid,
    loading: p.saving,
    onClick: () => amount && p.onSave({ amount, method, reason: reason.trim() }),
  });
  const max = formatMoney(p.advance);
  return (
    <Screen title={c.refund} subtitle={p.student}>
      <MoneyInput
        label={c.refundAmount}
        value={amount}
        hint={c.refundMax.replace('{amount}', max)}
        onChange={setAmount}
      />
      <InlineButton onClick={() => setAmount(p.advance)}>
        {c.refundAll.replace('{amount}', max)}
      </InlineButton>
      <ChoiceSection
        title={c.refundMethod}
        value={method}
        options={METHODS.map((m) => ({ value: m, label: t.staffPay.methods[m] }))}
        onChange={setMethod}
      />
      <Fields footer={p.direct ? undefined : c.refundRequestHint}>
        <TextArea
          label={t.staffPayments.reason}
          rows={3}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Fields>
    </Screen>
  );
}
