import {
  CancelLessonRequest,
  type LessonDto,
  MakeupLessonRequest,
  MoveLessonRequest,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Field, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { FormError } from '../../components/panel-section.js';
import { type CalendarOptions, useLessonCall } from './use-calendar.js';
import { type When, WhenFields } from './when-fields.js';

const m = t.calendar.lesson;

interface FormProps {
  l: LessonDto;
  onDone: () => void;
}

/** BR-5: bekor qilish — sabab majburiy; kredit darhol yoki keyin (qoplovchi dars / oy yopilishi). */
export function CancelForm({ l, onDone }: FormProps) {
  const save = useLessonCall();
  const [reason, setReason] = useState('');
  const [credit, setCredit] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = CancelLessonRequest.safeParse({ reason, compensation: credit ? 'credit' : null });
    setInvalid(!body.success);
    if (body.success)
      save.mutate(
        { path: `/lessons/${l.id}/cancel`, method: 'POST', body: body.data },
        { onSuccess: onDone },
      );
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <Field
        label={m.cancelReason}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        error={invalid ? m.errors.reason : null}
      />
      <label className="flex cursor-pointer items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          className="size-4 accent-primary"
          checked={credit}
          onChange={(e) => setCredit(e.target.checked)}
        />
        {m.credit}
      </label>
      <p className="text-xs text-text-muted">{m.creditHint}</p>
      <FormError error={save.error} />
      <Button
        type="submit"
        variant="danger"
        size="sm"
        className="self-end"
        loading={save.isPending}
      >
        {m.cancelSubmit}
      </Button>
    </form>
  );
}

/** Ko'chirish (bekor + qoplovchi, kredit yo'q) yoki bekor qilingan darsga qoplovchi qo'yish. */
export function RescheduleForm({ l, kind, onDone }: FormProps & { kind: 'move' | 'makeup' }) {
  const save = useLessonCall();
  const [when, setWhen] = useState<When>({
    date: l.date,
    startTime: l.startTime,
    endTime: l.endTime,
  });
  const [invalid, setInvalid] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = (kind === 'move' ? MoveLessonRequest : MakeupLessonRequest).safeParse(when);
    setInvalid(!body.success);
    if (body.success)
      save.mutate(
        { path: `/lessons/${l.id}/${kind}`, method: 'POST', body: body.data },
        { onSuccess: onDone },
      );
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <WhenFields value={when} error={invalid ? m.errors.time : null} onChange={setWhen} />
      {kind === 'move' && <p className="text-xs text-text-muted">{m.moveHint}</p>}
      <FormError error={save.error} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {kind === 'move' ? m.moveSubmit : m.makeupSubmit}
      </Button>
    </form>
  );
}

/** FR-ORG-6: shu dars uchun o'rinbosar ustoz / boshqa xona; bo'sh — guruhdagi standart. */
export function SubstituteForm({ l, options, onDone }: FormProps & { options: CalendarOptions }) {
  const save = useLessonCall();
  const [teacherId, setTeacher] = useState(l.isSubstitute ? (l.teacher?.id ?? '') : '');
  const [roomId, setRoom] = useState(l.roomOverridden ? (l.room?.id ?? '') : '');
  const standard = { value: '', label: m.standard };
  const withRooms = options.rooms.length > 0;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = { teacherId: teacherId || null, ...(withRooms ? { roomId: roomId || null } : {}) };
    save.mutate({ path: `/lessons/${l.id}`, method: 'PATCH', body }, { onSuccess: onDone });
  };
  return (
    <form className="flex flex-col gap-3" onSubmit={submit} noValidate>
      <SelectField
        label={m.substituteTeacher}
        options={[standard, ...options.teachers]}
        value={teacherId}
        onChange={(e) => setTeacher(e.target.value)}
      />
      {withRooms && (
        <SelectField
          label={m.substituteRoom}
          options={[standard, ...options.rooms]}
          value={roomId}
          onChange={(e) => setRoom(e.target.value)}
        />
      )}
      <FormError error={save.error} />
      <Button type="submit" size="sm" className="self-end" loading={save.isPending}>
        {t.common.save}
      </Button>
    </form>
  );
}
