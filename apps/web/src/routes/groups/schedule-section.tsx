import { type GroupDetail, ReplaceScheduleRequest } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Field } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { todayYmd } from '../../lib/today.js';
import { EMPTY_BLOCK, type SlotBlock, SlotsEditor } from '../../screens/f1/slots-editor.js';
import { blocksOf, slotsOf } from './group-draft.js';
import { ActionError, Section } from './section.js';
import { type FormOptions, useGroupCall } from './use-groups.js';

const d = t.groups.detail;

interface Props {
  g: GroupDetail;
  form: FormOptions;
  canManage: boolean;
}

function ScheduleForm({ g, form, onDone }: Omit<Props, 'canManage'> & { onDone: () => void }) {
  const save = useGroupCall();
  const [blocks, setBlocks] = useState<SlotBlock[]>(() => {
    const current = blocksOf(g.slots);
    return current.length > 0 ? current : [EMPTY_BLOCK];
  });
  const [from, setFrom] = useState(() => (g.startDate > todayYmd() ? g.startDate : todayYmd()));
  const [error, setError] = useState<string | null>(null);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = ReplaceScheduleRequest.safeParse({ from, slots: slotsOf(blocks) });
    setError(body.success ? null : t.groups.form.errors.slots);
    if (body.success)
      save.mutate(
        { path: `/groups/${g.id}/schedule`, method: 'PUT', body: body.data },
        { onSuccess: onDone },
      );
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <SlotsEditor blocks={blocks} error={error} onChange={setBlocks} />
      <Field
        label={d.scheduleFrom}
        hint={d.scheduleHint}
        type="date"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <ActionError error={save.error} nameOf={form.nameOf} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {t.common.save}
      </Button>
    </form>
  );
}

/** W-10: amaldagi haftalik jadval va uni sanadan almashtirish (FR-ORG-4). */
export function ScheduleSection({ g, form, canManage }: Props) {
  const [open, setOpen] = useState(false);
  const toggle = canManage
    ? { label: d.changeSchedule, open, onToggle: () => setOpen((o) => !o) }
    : undefined;
  const blocks = blocksOf(g.slots);
  return (
    <Section title={d.schedule} toggle={toggle}>
      {blocks.length === 0 ? (
        <p className="text-sm text-text-muted">{t.groups.noSchedule}</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm text-text">
          {blocks.map((b) => (
            <li key={`${b.start}-${b.end}`} className="tabular-nums">
              {b.days.map((day) => t.calendar.daysShort[day - 1]).join(', ')} · {b.start}–{b.end}
            </li>
          ))}
        </ul>
      )}
      {open && <ScheduleForm g={g} form={form} onDone={() => setOpen(false)} />}
    </Section>
  );
}
