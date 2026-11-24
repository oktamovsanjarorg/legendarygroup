import type { CashClosing, CashDay } from '@lg/contracts';
import { formatDateTime, formatMoney, formatTime, formatYmd, miniappMessages as t } from '@lg/i18n';
import {
  InlineButton,
  ListItem,
  MoneyInput,
  MoneyText,
  Section,
  StatusChip,
  TextArea,
  TextField,
  useMainButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import { type CashForm, cashReady } from '../../data/staff-cash.js';
import { ConfirmSheet } from './kit.js';

const c = t.cash;

const DiffChip = ({ diff }: { diff: bigint }) =>
  diff === 0n ? (
    <StatusChip tone="success">{c.noDiff}</StatusChip>
  ) : (
    <StatusChip tone="danger">{`${diff > 0n ? '+' : ''}${formatMoney(diff)}`}</StatusChip>
  );

function ClosedDay({ day, closed }: { day: CashDay; closed: NonNullable<CashDay['closed']> }) {
  const late = BigInt(day.expectedCash) - BigInt(closed.expectedCash);
  return (
    <Section
      title={c.closed}
      footer={
        late !== 0n ? (
          <span className="text-warning">
            {c.lateChange.replace('{amount}', formatMoney(late))}
          </span>
        ) : undefined
      }
    >
      <ListItem title={c.counted} after={<MoneyText amount={BigInt(closed.countedCash)} />} />
      <ListItem
        title={c.diff}
        after={<DiffChip diff={BigInt(closed.countedCash) - BigInt(closed.expectedCash)} />}
      />
      <ListItem
        title={c.closedBy
          .replace('{name}', closed.by ?? '—')
          .replace('{time}', formatDateTime(new Date(closed.at)))}
        subtitle={closed.note ?? undefined}
      />
    </Section>
  );
}

function CountForm({
  expected,
  form,
  onForm,
}: {
  expected: bigint;
  form: CashForm;
  onForm: (f: CashForm) => void;
}) {
  const diff = form.counted === null ? null : form.counted - expected;
  return (
    <>
      <MoneyInput
        label={c.counted}
        allowZero
        value={form.counted}
        onChange={(counted) => onForm({ ...form, counted })}
      />
      {diff !== null && (
        <p className="flex items-center justify-between px-4 text-text-muted">
          <span>{c.diff}</span>
          <DiffChip diff={diff} />
        </p>
      )}
      {diff !== null && diff !== 0n && (
        <TextArea
          label={c.note}
          placeholder={c.noteHint}
          rows={2}
          maxLength={500}
          value={form.note}
          onChange={(e) => onForm({ ...form, note: e.target.value })}
        />
      )}
    </>
  );
}

function Payments({ day }: { day: CashDay }) {
  return (
    <Section title={c.payments}>
      {day.payments.length === 0 && <ListItem title={c.noPayments} />}
      {day.payments.map((p) => (
        <ListItem
          key={p.id}
          title={p.student}
          subtitle={[formatTime(new Date(p.paidAt)), p.receiptNumber].filter(Boolean).join(' · ')}
          after={<MoneyText amount={BigInt(p.amount)} />}
        />
      ))}
    </Section>
  );
}

export interface CashViewProps {
  day: CashDay;
  today: string;
  form: CashForm;
  saving: boolean;
  history: readonly CashClosing[];
  onDate: (d: string) => void;
  onForm: (f: CashForm) => void;
  onClose: () => void;
  onMore?: () => void;
}

/** MS-16 Kassa (T-140, FR-PAY-10): sanash → farq → yopish (tasdiq bilan, qaytarilmaydi). */
export function CashView(p: CashViewProps) {
  const { day, form } = p;
  const [confirm, setConfirm] = useState(false);
  const expected = BigInt(day.expectedCash);
  useMainButton({
    text: c.close,
    visible: day.closed === null && form.counted !== null,
    disabled: !cashReady(form, expected),
    loading: p.saving,
    onClick: () => setConfirm(true),
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-2xl font-bold text-text">{c.title}</h1>
      <TextField
        label={c.date}
        type="date"
        max={p.today}
        value={day.date}
        onChange={(e) => e.target.value && p.onDate(e.target.value)}
      />
      <Section>
        <ListItem title={c.expected} after={<MoneyText amount={expected} />} />
      </Section>
      {day.closed ? (
        <ClosedDay day={day} closed={day.closed} />
      ) : (
        <CountForm expected={expected} form={form} onForm={p.onForm} />
      )}
      <Payments day={day} />
      {p.history.length > 0 && (
        <Section title={c.history}>
          {p.history.map((h) => (
            <ListItem
              key={h.id}
              title={formatYmd(h.date)}
              subtitle={h.closedByName}
              after={<DiffChip diff={BigInt(h.diff)} />}
              chevron
              onClick={() => p.onDate(h.date)}
            />
          ))}
        </Section>
      )}
      {p.onMore && <InlineButton onClick={p.onMore}>{t.staffKit.more}</InlineButton>}
      <ConfirmSheet
        open={confirm}
        title={c.confirmTitle.replace('{date}', formatYmd(day.date))}
        action={c.close}
        onClose={() => setConfirm(false)}
        onConfirm={p.onClose}
      />
    </main>
  );
}
