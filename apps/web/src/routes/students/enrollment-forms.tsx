import {
  CreateFreezeRequest,
  EndEnrollmentRequest,
  type EnrollmentDto,
  EnrollRequest,
  TransferEnrollmentRequest,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Field, SelectField } from '@lg/ui-web';
import { type FormEvent, type ReactNode, useState } from 'react';
import { FormError } from '../../components/panel-section.js';
import { addDays } from '../../lib/ymd.js';
import { todayYmd } from '../../lib/today.js';
import { type StudentCall, useStudentCall } from './use-students.js';

const m = t.studentCard.enrollments;
export type GroupOption = { value: string; label: string };
const withNone = (xs: readonly GroupOption[]) => [{ value: '', label: t.groups.form.none }, ...xs];
type Parsed = { success: true; data: unknown } | { success: false };

interface ShellProps {
  submitLabel: string;
  /** Tekshirilgan so'rov yoki `null` (xato maydon yonida ko'rsatilgan). */
  build: () => StudentCall | null;
  onDone: () => void;
  children: ReactNode;
}

/** Yozilish formalari qobig'i: yuborish, server xatosi, tugma. */
function FormShell({ submitLabel, build, onDone, children }: ShellProps) {
  const save = useStudentCall();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const call = build();
    if (call) save.mutate(call, { onSuccess: onDone });
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      {children}
      <FormError error={save.error} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {submitLabel}
      </Button>
    </form>
  );
}

const call = (path: string, parsed: Parsed): StudentCall | null =>
  parsed.success ? { path, method: 'POST', body: parsed.data } : null;

interface EnrollProps {
  studentId: string;
  groups: readonly GroupOption[];
  onDone: () => void;
}

/** FR-STU-3: guruhga yozish (sig'im va takror — server tekshiradi: `GROUP_FULL`, `ALREADY_ENROLLED`). */
export function EnrollForm({ studentId, groups, onDone }: EnrollProps) {
  const [groupId, setGroup] = useState('');
  const [startDate, setStart] = useState(todayYmd);
  const [invalid, setInvalid] = useState(false);
  const build = () => {
    const parsed = EnrollRequest.safeParse({ studentId, groupId, startDate });
    setInvalid(!parsed.success);
    return call('/enrollments', parsed);
  };
  return (
    <FormShell submitLabel={m.enrollSubmit} build={build} onDone={onDone}>
      <SelectField
        label={m.group}
        options={withNone(groups)}
        value={groupId}
        onChange={(e) => setGroup(e.target.value)}
        error={invalid && !groupId ? m.errors.groupId : null}
      />
      <Field
        label={m.startDate}
        type="date"
        value={startDate}
        onChange={(e) => setStart(e.target.value)}
        error={invalid && groupId ? m.errors.date : null}
      />
    </FormShell>
  );
}

interface ActionProps {
  e: EnrollmentDto;
  onDone: () => void;
}

/** Ko'chirish: eski guruhda `sana - 1` gacha, yangisida sanadan; chegirma saqlanadi. */
export function TransferForm({
  e,
  groups,
  onDone,
}: ActionProps & { groups: readonly GroupOption[] }) {
  const [toGroupId, setGroup] = useState('');
  // Eski guruhda kamida bir kun qolishi kerak: eng erta sana — yozilgan kunning ertasi.
  const earliest = addDays(e.startDate, 1);
  const [date, setDate] = useState(() => (todayYmd() > earliest ? todayYmd() : earliest));
  const [invalid, setInvalid] = useState(false);
  const build = () => {
    const parsed = TransferEnrollmentRequest.safeParse({ toGroupId, date });
    setInvalid(!parsed.success);
    return call(`/enrollments/${e.id}/transfer`, parsed);
  };
  return (
    <FormShell submitLabel={m.transferSubmit} build={build} onDone={onDone}>
      <SelectField
        label={m.toGroup}
        options={withNone(groups.filter((g) => g.value !== e.group.id))}
        value={toGroupId}
        onChange={(ev) => setGroup(ev.target.value)}
        error={invalid && !toGroupId ? m.errors.groupId : null}
      />
      <Field
        label={m.startDate}
        hint={m.transferHint}
        type="date"
        min={earliest}
        value={date}
        onChange={(ev) => setDate(ev.target.value)}
      />
    </FormShell>
  );
}

/** BR-9: muzlatish — kamida 14 kun, sabab majburiy. */
export function FreezeForm({ e, onDone }: ActionProps) {
  const [from, setFrom] = useState(todayYmd);
  const [to, setTo] = useState(() => addDays(todayYmd(), 14));
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState<{ range?: string; reason?: string }>({});
  const build = () => {
    const parsed = CreateFreezeRequest.safeParse({ from, to, reason });
    const bad = parsed.success ? [] : parsed.error.issues.map((i) => i.path[0]);
    setErrors({
      ...(bad.includes('reason') ? { reason: m.errors.reason } : {}),
      ...(bad.some((f) => f !== 'reason') ? { range: m.errors.range } : {}),
    });
    return call(`/enrollments/${e.id}/freezes`, parsed);
  };
  return (
    <FormShell submitLabel={m.freezeSubmit} build={build} onDone={onDone}>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={m.freezeFrom}
          type="date"
          value={from}
          onChange={(ev) => setFrom(ev.target.value)}
        />
        <Field
          label={m.freezeTo}
          type="date"
          hint={m.freezeHint}
          value={to}
          onChange={(ev) => setTo(ev.target.value)}
          error={errors.range}
        />
      </div>
      <Field
        label={m.reason}
        value={reason}
        onChange={(ev) => setReason(ev.target.value)}
        error={errors.reason}
      />
    </FormShell>
  );
}

const END_REASONS = (['left', 'finished'] as const).map((r) => ({ value: r, label: m.reasons[r] }));

/** Guruhdan chiqarish: oxirgi kun + sabab (ketdi/tugatdi); kelajak sana — rejalashtirilgan chiqish. */
export function EndForm({ e, onDone }: ActionProps) {
  const [endDate, setEnd] = useState(todayYmd);
  const [reason, setReason] = useState<string>('left');
  const [note, setNote] = useState('');
  const [invalid, setInvalid] = useState(false);
  const build = () => {
    const parsed = EndEnrollmentRequest.safeParse({ endDate, reason, note: note.trim() || null });
    setInvalid(!parsed.success);
    return call(`/enrollments/${e.id}/end`, parsed);
  };
  return (
    <FormShell submitLabel={m.endSubmit} build={build} onDone={onDone}>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={m.endDate}
          type="date"
          value={endDate}
          onChange={(ev) => setEnd(ev.target.value)}
          error={invalid ? m.errors.date : null}
        />
        <SelectField
          label={m.reason}
          options={END_REASONS}
          value={reason}
          onChange={(ev) => setReason(ev.target.value)}
        />
      </div>
      <Field label={m.note} value={note} onChange={(ev) => setNote(ev.target.value)} />
    </FormShell>
  );
}
