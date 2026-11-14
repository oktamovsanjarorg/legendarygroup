import { type GroupDetail, UpdateGroupRequest } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Field, MoneyField, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import type { GroupFormErrors } from '../../screens/f1/group-form.js';
import { groupErrors } from './group-draft.js';
import { ActionError, Section } from './section.js';
import { type FormOptions, useGroupCall } from './use-groups.js';

const f = t.groups.form;

interface Props {
  g: GroupDetail;
  form: FormOptions;
}

interface Dates {
  startDate: string;
  endDate: string;
}

function DateFields(p: {
  lockStart: boolean;
  value: Dates;
  errors: GroupFormErrors;
  onChange: (d: Dates) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field
        label={f.startDate}
        type="date"
        disabled={p.lockStart}
        value={p.value.startDate}
        onChange={(e) => p.onChange({ ...p.value, startDate: e.target.value })}
        error={p.errors.startDate}
      />
      <Field
        label={f.endDate}
        type="date"
        value={p.value.endDate}
        onChange={(e) => p.onChange({ ...p.value, endDate: e.target.value })}
        error={p.errors.endDate}
      />
    </div>
  );
}

function EditForm({ g, form, onDone }: Props & { onDone: () => void }) {
  const save = useGroupCall();
  const [name, setName] = useState(g.name);
  const [roomId, setRoomId] = useState(g.room?.id ?? '');
  const [maxStudents, setMax] = useState(String(g.maxStudents));
  const [price, setPrice] = useState<bigint | null>(BigInt(g.monthlyPrice));
  const [dates, setDates] = useState({ startDate: g.startDate, endDate: g.endDate ?? '' });
  const [errors, setErrors] = useState<GroupFormErrors>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const parsed = UpdateGroupRequest.safeParse({
      name,
      roomId: roomId || null,
      maxStudents: Number(maxStudents),
      monthlyPrice: (price ?? 0n).toString(),
      endDate: dates.endDate || null,
      // START_DATE_LOCKED: boshlanish sanasi faqat yig'ilayotgan guruhda o'zgaradi.
      ...(g.status === 'forming' ? { startDate: dates.startDate } : {}),
    });
    setErrors(parsed.success ? {} : groupErrors(parsed.error.issues));
    if (!parsed.success) return;
    const body = { ...parsed.data, monthlyPrice: `${parsed.data.monthlyPrice ?? 0n}` };
    save.mutate({ path: `/groups/${g.id}`, method: 'PATCH', body }, { onSuccess: onDone });
  };
  const rooms = [{ value: '', label: f.none }, ...form.options.rooms];
  return (
    <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
      <Field
        label={f.name}
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
      />
      <SelectField
        label={f.room}
        options={rooms}
        value={roomId}
        onChange={(e) => setRoomId(e.target.value)}
      />
      <Field
        label={f.capacity}
        inputMode="numeric"
        value={maxStudents}
        onChange={(e) => setMax(e.target.value)}
        error={errors.maxStudents}
      />
      <MoneyField label={f.price} value={price} onChange={setPrice} />
      <DateFields
        lockStart={g.status !== 'forming'}
        value={dates}
        errors={errors}
        onChange={setDates}
      />
      <ActionError error={save.error} nameOf={form.nameOf} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {t.common.save}
      </Button>
    </form>
  );
}

/** W-10: guruh ma'lumotini tahrirlash (nom, xona, sig'im, narx, sanalar) — PATCH. */
export function EditSection(p: Props) {
  const [open, setOpen] = useState(false);
  const toggle = { label: t.common.edit, open, onToggle: () => setOpen((o) => !o) };
  return (
    <Section title={t.groups.detail.edit} toggle={toggle}>
      {open && <EditForm {...p} onDone={() => setOpen(false)} />}
    </Section>
  );
}
