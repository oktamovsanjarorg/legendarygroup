import type { PayrollItem, PayrollRunDetail, TeacherPayrollSummary } from '@lg/contracts';
import { formatDateTime, formatMoney, formatPeriod, miniappMessages as t } from '@lg/i18n';
import {
  InlineButton,
  KpiTile,
  ListItem,
  MoneyInput,
  MoneyText,
  Section,
  StatusChip,
  TextArea,
  useMainButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import { isManual, itemHint, type RunPhase } from '../../data/staff-payroll.js';
import { EmptyRow, Fields, Screen } from './form-kit.js';
import { ChoiceSection, ConfirmSheet, PeriodBar } from './kit.js';

const c = t.staffPayroll;

export type RunAction = 'generate' | 'approve' | 'pay';

const TONE = { none: 'muted', draft: 'warning', approved: 'info', paid: 'success' } as const;

/** Asosiy tugma — bosqichga qarab; `canApprove` — `approval.decide`. */
function mainAction(phase: RunPhase, canApprove: boolean): RunAction | null {
  if (phase === 'ready') return canApprove ? 'approve' : 'generate';
  if (phase === 'approved') return 'pay';
  return phase === 'paid' ? null : 'generate';
}

const label = (a: RunAction, hasRun: boolean): string => {
  if (a === 'approve') return c.approve;
  if (a === 'pay') return c.pay;
  return hasRun ? c.regenerate : c.generate;
};

const summary = (s: TeacherPayrollSummary): string =>
  [
    c.earned.replace('{sum}', formatMoney(BigInt(s.earned))),
    BigInt(s.extras) !== 0n && c.extras.replace('{sum}', formatMoney(BigInt(s.extras))),
    BigInt(s.advances) !== 0n && c.advances.replace('{sum}', formatMoney(-BigInt(s.advances))),
  ]
    .filter(Boolean)
    .join(' · ');

const phaseHint = (phase: RunPhase): string | null => {
  if (phase === 'open') return c.openMonth;
  return phase === 'stale' ? c.stale : null;
};

function RunSummary({ run, phase }: { run: PayrollRunDetail | null; phase: RunPhase }) {
  const status = run?.status ?? 'none';
  const hint = phaseHint(phase);
  return (
    <>
      <div className="flex items-center justify-between gap-2 px-2">
        <StatusChip tone={TONE[status]}>{c.states[status]}</StatusChip>
        {run?.generatedAt && (
          <span className="text-sm text-text-muted">
            {c.generatedAt.replace('{at}', formatDateTime(new Date(run.generatedAt)))}
          </span>
        )}
      </div>
      {run && <KpiTile label={c.total} value={<MoneyText amount={BigInt(run.totalAmount)} />} />}
      {hint && <p className="px-2 text-sm text-text-muted">{hint}</p>}
    </>
  );
}

export interface PayrollViewProps {
  run: PayrollRunDetail | null;
  phase: RunPhase;
  period: string;
  current: string;
  canApprove: boolean;
  busy: boolean;
  onStep: (s: -1 | 1) => void;
  onAction: (a: RunAction) => void;
  onTeacher: (teacherId: string) => void;
  onContracts: () => void;
  onAdvances: () => void;
  onAdjust: () => void;
}

/** MS-28 Oyliklar (T-157): hisoblash → tekshirish → tasdiqlash → toʻlandi. */
export function PayrollView(p: PayrollViewProps) {
  const [ask, setAsk] = useState<'approve' | 'pay' | null>(null);
  const action = mainAction(p.phase, p.canApprove);
  const draft = p.run?.status === 'draft';
  const act = (a: RunAction) => (a === 'generate' ? p.onAction(a) : setAsk(a));
  useMainButton({
    text: label(action ?? 'generate', p.run !== null),
    visible: action !== null,
    loading: p.busy,
    onClick: () => action && act(action),
  });
  return (
    <Screen title={c.title}>
      <PeriodBar period={p.period} current={p.current} onStep={p.onStep} />
      <RunSummary run={p.run} phase={p.phase} />
      <Section title={c.staff}>
        {!p.run && <EmptyRow text={c.notYet} />}
        {p.run?.teachers.length === 0 && <EmptyRow text={c.empty} />}
        {p.run?.teachers.map((s) => (
          <ListItem
            key={s.teacherId}
            title={s.teacherName}
            subtitle={summary(s)}
            after={<MoneyText amount={BigInt(s.totalNet)} />}
            chevron
            onClick={() => p.onTeacher(s.teacherId)}
          />
        ))}
      </Section>
      {action === 'approve' && (
        <InlineButton onClick={() => p.onAction('generate')}>{c.regenerate}</InlineButton>
      )}
      <Section>
        {draft && <ListItem title={c.bonusMenu} chevron onClick={p.onAdjust} />}
        <ListItem title={c.contracts} chevron onClick={p.onContracts} />
        <ListItem title={c.advancesMenu} chevron onClick={p.onAdvances} />
      </Section>
      <ConfirmSheet
        open={ask !== null}
        title={ask === 'pay' ? c.payTitle : c.approveTitle}
        action={ask === 'pay' ? c.pay : c.approve}
        onClose={() => setAsk(null)}
        onConfirm={() => ask && p.onAction(ask)}
      />
    </Screen>
  );
}

/** MS-28a Bitta xodim: qatorlar va qanday hisoblangani. */
export function PayrollTeacherView(p: {
  period: string;
  summary: TeacherPayrollSummary;
  draft: boolean;
  busy: boolean;
  onAdjust: () => void;
  onRemove: (item: PayrollItem) => void;
}) {
  const [remove, setRemove] = useState<PayrollItem | null>(null);
  const { summary: s } = p;
  useMainButton({ text: c.adjustTitle, visible: p.draft, loading: p.busy, onClick: p.onAdjust });
  return (
    <Screen title={s.teacherName} subtitle={formatPeriod(p.period)}>
      <KpiTile label={c.net} value={<MoneyText amount={BigInt(s.totalNet)} />} />
      <Section>
        {s.items.map((i) => (
          <ListItem
            key={i.id}
            title={c.kinds[i.kind]}
            subtitle={itemHint(i)}
            after={<MoneyText amount={BigInt(i.amount)} />}
            onClick={p.draft && isManual(i) ? () => setRemove(i) : undefined}
          />
        ))}
      </Section>
      <ConfirmSheet
        open={remove !== null}
        title={c.removeTitle}
        action={c.removeItem}
        danger
        onClose={() => setRemove(null)}
        onConfirm={() => remove && p.onRemove(remove)}
      />
    </Screen>
  );
}

export interface AdjustBody {
  teacherId: string;
  kind: 'bonus' | 'penalty';
  amount: string;
  note: string;
}

/** BR-26 Bonus/jarima — sabab bilan. */
export function PayrollAdjustView(p: {
  period: string;
  staff: readonly { id: string; fullName: string }[];
  /** Xodim kartochkasidan kelinganda — tanlangan. */
  teacherId: string | null;
  saving: boolean;
  onSave: (b: AdjustBody) => void;
}) {
  const [teacherId, setTeacher] = useState(p.teacherId);
  const [kind, setKind] = useState<'bonus' | 'penalty'>('bonus');
  const [amount, setAmount] = useState<bigint | null>(null);
  const [text, setText] = useState('');
  const note = text.trim();
  useMainButton({
    text: c.save,
    disabled: !teacherId || amount === null || note.length < 3,
    loading: p.saving,
    onClick: () =>
      teacherId &&
      amount !== null &&
      p.onSave({ teacherId, kind, amount: amount.toString(), note }),
  });
  return (
    <Screen title={c.adjustTitle} subtitle={formatPeriod(p.period)}>
      <ChoiceSection
        title={c.kind}
        value={kind}
        options={[
          { value: 'bonus', label: c.kinds.bonus },
          { value: 'penalty', label: c.kinds.penalty },
        ]}
        onChange={setKind}
      />
      <Fields>
        <MoneyInput label={c.amount} value={amount} onChange={setAmount} />
        <TextArea
          label={c.note}
          rows={2}
          maxLength={255}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Fields>
      {p.teacherId === null && (
        <ChoiceSection
          title={c.who}
          value={teacherId}
          options={p.staff.map((s) => ({ value: s.id, label: s.fullName }))}
          onChange={setTeacher}
        />
      )}
    </Screen>
  );
}
