import type { PaymentHistoryItem, PaymentMethod, PaymentView } from '@lg/contracts';
import { formatDateTime, formatMoney, formatPeriod, miniappMessages as t } from '@lg/i18n';
import {
  InlineButton,
  ListItem,
  MoneyText,
  Section,
  Segmented,
  StatusChip,
  TextArea,
  useMainButton,
} from '@lg/ui-tg';
import { FileText, Undo2, UserRound } from 'lucide-react';
import { useState } from 'react';
import { EmptyRow, Fields, InfoSection, Screen } from './form-kit.js';
import { PeriodBar } from './kit.js';

const c = t.staffPayments;
const ALL = 'all';
const METHODS = ['cash', 'card', 'bank', 'other'] as const satisfies readonly PaymentMethod[];

const rowText = (i: PaymentHistoryItem) =>
  [
    formatDateTime(new Date(i.paidAt)),
    i.kind === 'payment' ? t.staffPay.methods[i.method] : c.kinds[i.kind],
    i.receiptNumber,
  ]
    .filter(Boolean)
    .join(' · ');

export interface PaymentsViewProps {
  period: string;
  current: string;
  method: PaymentMethod | null;
  total: bigint;
  items: readonly PaymentHistoryItem[];
  hasMore: boolean;
  loadingMore: boolean;
  onStep: (step: -1 | 1) => void;
  onMethod: (m: PaymentMethod | null) => void;
  onOpen: (id: string) => void;
  onMore: () => void;
}

/** MS-24 Toʻlovlar tarixi (T-153): oy, usul, sof tushum. */
export function PaymentsView(p: PaymentsViewProps) {
  return (
    <Screen title={c.title}>
      <PeriodBar period={p.period} current={p.current} onStep={p.onStep} />
      <Segmented
        label={c.method}
        value={p.method ?? ALL}
        options={[
          { value: ALL, label: c.allMethods },
          ...METHODS.map((m) => ({ value: m, label: t.staffPay.methods[m] })),
        ]}
        onChange={(v) => p.onMethod(v === ALL ? null : (v as PaymentMethod))}
      />
      <div className="flex items-center justify-between rounded-xl bg-bg p-4">
        <span className="text-sm text-text-muted">{c.net}</span>
        <MoneyText amount={p.total} className="text-xl font-bold" />
      </div>
      <Section>
        {p.items.length === 0 && <EmptyRow text={c.empty} />}
        {p.items.map((i) => (
          <ListItem
            key={i.id}
            title={<span className={i.cancelled ? 'line-through' : ''}>{i.student}</span>}
            subtitle={i.cancelled ? `${rowText(i)} · ${c.cancelled}` : rowText(i)}
            after={<MoneyText amount={BigInt(i.amount)} />}
            onClick={() => p.onOpen(i.id)}
          />
        ))}
      </Section>
      {p.hasMore && (
        <InlineButton onClick={() => !p.loadingMore && p.onMore()}>{c.more}</InlineButton>
      )}
    </Screen>
  );
}

function Actions(p: Pick<PaymentViewProps, 'v' | 'onReceipt' | 'onReverse' | 'onStudent'>) {
  return (
    <Section>
      <ListItem
        before={<UserRound className="size-5" aria-hidden />}
        title={p.v.studentName}
        subtitle={c.student}
        chevron
        onClick={p.onStudent}
      />
      {p.v.receiptNumber && (
        <ListItem
          before={<FileText className="size-5" aria-hidden />}
          title={c.openReceipt}
          onClick={p.onReceipt}
        />
      )}
      {p.onReverse && (
        <ListItem
          before={<Undo2 className="size-5 text-danger" aria-hidden />}
          title={<span className="text-danger">{c.reverse}</span>}
          chevron
          onClick={p.onReverse}
        />
      )}
    </Section>
  );
}

export interface PaymentViewProps {
  v: PaymentView;
  onStudent: () => void;
  onReceipt: () => void;
  /** Musbat, bekor qilinmagan toʻlov va ruxsat bor. */
  onReverse?: () => void;
}

/** MS-24a Toʻlov tafsiloti (FR-PAY-6/8/9). */
export function PaymentDetailView(p: PaymentViewProps) {
  const { v } = p;
  return (
    <Screen title={c.kinds[v.kind]} subtitle={formatDateTime(new Date(v.paidAt))}>
      <div className="flex items-center justify-between rounded-xl bg-bg p-4">
        <MoneyText amount={BigInt(v.amount)} className="text-2xl font-bold" />
        {v.reversed && <StatusChip tone="danger">{c.cancelled}</StatusChip>}
      </div>
      {v.reversed && (
        <p className="rounded-xl bg-danger-bg p-4 text-sm text-danger">
          {c.reversedAt.replace('{time}', formatDateTime(new Date(v.reversed.at)))}
          <br />
          {v.reversed.reason}
        </p>
      )}
      <InfoSection
        items={[
          { label: c.method, value: t.staffPay.methods[v.method] },
          { label: c.receipt, value: v.receiptNumber },
          {
            label: c.by,
            value: [v.createdBy, v.viaSubmission && c.viaSubmission].filter(Boolean).join(' · '),
          },
        ]}
      />
      {v.allocations.length > 0 && (
        <Section title={c.allocation}>
          {v.allocations.map((a) => (
            <ListItem
              key={a.period}
              title={formatPeriod(a.period)}
              after={<MoneyText amount={BigInt(a.amount)} />}
            />
          ))}
        </Section>
      )}
      <Actions {...p} />
    </Screen>
  );
}

/** Storno: sabab majburiy; bugungi boʻlmasa — Directorga soʻrov. */
export function ReverseView(p: {
  v: Pick<PaymentView, 'amount' | 'studentName' | 'canReverseNow'>;
  saving: boolean;
  onSave: (reason: string) => void;
}) {
  const [text, setText] = useState('');
  const reason = text.trim();
  useMainButton({
    text: p.v.canReverseNow ? c.doReverse : c.sendRequest,
    disabled: reason.length < 3,
    loading: p.saving,
    onClick: () => p.onSave(reason),
  });
  return (
    <Screen
      title={c.reverseTitle}
      subtitle={`${p.v.studentName} · ${formatMoney(BigInt(p.v.amount))}`}
    >
      <Fields footer={p.v.canReverseNow ? c.reverseHint : c.reverseRequestHint}>
        <TextArea
          label={c.reason}
          rows={3}
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Fields>
    </Screen>
  );
}
