import { CreateExtraLessonRequest } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Drawer, Field, SelectField } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { FormError } from '../../components/panel-section.js';
import { type CalendarOptions, useLessonCall } from './use-calendar.js';
import { type When, WhenFields } from './when-fields.js';

const m = t.calendar.lesson;
const FORM_ID = 'extra-lesson-form';

interface Props {
  date: string;
  options: CalendarOptions;
  onClose: () => void;
}

/** W-11: qo'shimcha dars (FR-ORG-5) — guruh, sana/vaqt, ixtiyoriy xona va mavzu. */
export function ExtraDrawer({ date, options, onClose }: Props) {
  const save = useLessonCall();
  const [groupId, setGroup] = useState('');
  const [roomId, setRoom] = useState('');
  const [topic, setTopic] = useState('');
  const [when, setWhen] = useState<When>({ date, startTime: '15:00', endTime: '16:30' });
  const [errors, setErrors] = useState<{ groupId?: string; time?: string }>({});
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const body = CreateExtraLessonRequest.safeParse({
      ...when,
      groupId,
      topic: topic.trim() || null,
      ...(roomId ? { roomId } : {}),
    });
    const bad = body.success ? [] : body.error.issues.map((i) => String(i.path[0]));
    setErrors({
      ...(bad.includes('groupId') ? { groupId: m.errors.groupId } : {}),
      ...(bad.some((f) => f !== 'groupId') ? { time: m.errors.time } : {}),
    });
    if (body.success)
      save.mutate({ path: '/lessons', method: 'POST', body: body.data }, { onSuccess: onClose });
  };
  const none = { value: '', label: t.groups.form.none };
  const footer = (
    <>
      <Button variant="secondary" onClick={onClose}>
        {t.common.cancel}
      </Button>
      <Button type="submit" form={FORM_ID} loading={save.isPending}>
        {m.extraSubmit}
      </Button>
    </>
  );
  return (
    <Drawer open title={m.extraTitle} closeLabel={t.common.close} onClose={onClose} footer={footer}>
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <SelectField
          label={m.group}
          options={[none, ...options.groups]}
          value={groupId}
          onChange={(e) => setGroup(e.target.value)}
          error={errors.groupId}
        />
        <WhenFields value={when} error={errors.time} onChange={setWhen} />
        {options.rooms.length > 0 && (
          <SelectField
            label={m.room}
            options={[{ value: '', label: m.standard }, ...options.rooms]}
            value={roomId}
            onChange={(e) => setRoom(e.target.value)}
          />
        )}
        <Field label={m.topic} value={topic} onChange={(e) => setTopic(e.target.value)} />
        <FormError error={save.error} />
      </form>
    </Drawer>
  );
}
