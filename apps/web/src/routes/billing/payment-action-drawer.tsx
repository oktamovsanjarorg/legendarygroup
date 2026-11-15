import type { PaymentView } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Drawer, MoneyField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { errorText } from '../../api/errors.js';
import { type PayMethod } from '../../screens/f2/pay-entry.js';
import { API_METHOD } from './pay-entry.js';
import { usePaymentAction } from './use-payment.js';

const d = t.payDetail;
const FORM_ID = 'payment-action-form';
const METHODS = Object.keys(t.payEntry.methods) as PayMethod[];

export interface ActionDrawerProps {
  kind: 'reverse' | 'refund';
  p: PaymentView;
  /** To'g'ridan-to'g'ri bajariladi; `false` — Director'ga so'rov (T-119). */
  direct: boolean;
  onDone: (message: string) => void;
  onClose: () => void;
}

function Reason({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="pay-action-reason" className="text-sm font-medium text-text">
        {d.reason}
      </label>
      <textarea
        id="pay-action-reason"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        aria-invalid={Boolean(error)}
        className="rounded-md border border-border bg-bg p-3 text-sm outline-none focus:border-primary"
      />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

function MethodSelect({ value, onChange }: { value: PayMethod; onChange: (m: PayMethod) => void }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-text">
      {d.refundMethod}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as PayMethod)}
        className="min-h-11 rounded-md border border-border bg-bg px-3 text-sm"
      >
        {METHODS.map((m) => (
          <option key={m} value={m}>
            {t.payEntry.methods[m]}
          </option>
        ))}
      </select>
    </label>
  );
}

/** W-17: storno (BR-16) yoki refund (BR-17) — sabab majburiy; huquq yetmasa so'rov. */
export function PaymentActionDrawer({ kind, p, direct, onDone, onClose }: ActionDrawerProps) {
  const act = usePaymentAction();
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [method, setMethod] = useState<PayMethod>('cash');
  const [errors, setErrors] = useState<{ reason?: string; amount?: string }>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const r = reason.trim();
    const errs = {
      reason: r.length < 3 ? d.reasonShort : undefined,
      amount: kind === 'refund' && (amount ?? 0n) <= 0n ? d.amountRequired : undefined,
    };
    setErrors(errs);
    if (errs.reason || errs.amount) return;
    const done = { onSuccess: () => onDone(direct ? d.done : d.requestSent) };
    if (kind === 'reverse') act.mutate({ kind, paymentId: p.id, reason: r, direct }, done);
    else
      act.mutate(
        {
          kind,
          studentId: p.studentId,
          amount: String(amount),
          method: API_METHOD[method],
          reason: r,
          direct,
        },
        done,
      );
  };
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={FORM_ID} variant="danger" loading={act.isPending}>
        {direct ? d.confirm : d.sendRequest}
      </Button>
    </>
  );
  return (
    <Drawer
      open
      title={kind === 'reverse' ? d.reverseTitle : d.refundTitle}
      closeLabel={t.common.close}
      onClose={onClose}
      footer={footer}
    >
      <form id={FORM_ID} onSubmit={submit} noValidate className="flex flex-col gap-4">
        {!direct && <p className="text-sm text-text-muted">{d.reverseHintRequest}</p>}
        {kind === 'refund' && (
          <>
            <MoneyField
              label={d.refundAmount}
              value={amount}
              onChange={setAmount}
              error={errors.amount}
            />
            <MethodSelect value={method} onChange={setMethod} />
          </>
        )}
        <Reason value={reason} onChange={setReason} error={errors.reason} />
        {act.isError && (
          <p role="alert" className="text-sm text-danger">
            {errorText(act.error)}
          </p>
        )}
      </form>
    </Drawer>
  );
}
