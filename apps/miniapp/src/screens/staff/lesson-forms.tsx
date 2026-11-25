import { miniappMessages as t } from '@lg/i18n';
import { Segmented, TextArea, TextField, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';
import { type LessonWhen, whenReady } from '../../data/staff-calendar.js';
import { Fields, Screen } from './form-kit.js';
import { ChoiceSection } from './kit.js';

const c = t.staffCalendar;
const DEFAULT = '';

interface Option {
  id: string;
  name: string;
}
const choices = (list: readonly Option[], none: string) => [
  { value: DEFAULT, label: none },
  ...list.map((x) => ({ value: x.id, label: x.name })),
];

/** Sana, vaqt va xona maydonlari. */
export function WhenFields(p: {
  value: LessonWhen;
  today: string;
  rooms: readonly Option[];
  onChange: (w: LessonWhen) => void;
}) {
  const { value: w, onChange } = p;
  return (
    <>
      <Fields>
        <TextField
          label={c.date}
          type="date"
          min={p.today}
          value={w.date}
          onChange={(e) => onChange({ ...w, date: e.target.value })}
        />
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label={c.start}
            type="time"
            value={w.startTime}
            onChange={(e) => onChange({ ...w, startTime: e.target.value })}
          />
          <TextField
            label={c.end}
            type="time"
            value={w.endTime}
            onChange={(e) => onChange({ ...w, endTime: e.target.value })}
          />
        </div>
      </Fields>
      <ChoiceSection
        title={c.room}
        value={w.roomId ?? DEFAULT}
        options={choices(p.rooms, c.defaultRoom)}
        onChange={(v) => onChange({ ...w, roomId: v || undefined })}
      />
    </>
  );
}

/** Ko'chirish yoki qoplovchi dars. */
export function LessonWhenView(p: {
  title: string;
  initial: LessonWhen;
  today: string;
  rooms: readonly Option[];
  withReason: boolean;
  saving: boolean;
  onSave: (w: LessonWhen, reason: string | null) => void;
}) {
  const [when, setWhen] = useState(p.initial);
  const [reason, setReason] = useState('');
  const note = reason.trim();
  useMainButton({
    text: p.title,
    disabled: !whenReady(when, p.today) || (note !== '' && note.length < 3),
    loading: p.saving,
    onClick: () => p.onSave(when, note || null),
  });
  return (
    <Screen title={p.title}>
      <WhenFields value={when} today={p.today} rooms={p.rooms} onChange={setWhen} />
      {p.withReason && (
        <Fields>
          <TextArea
            label={c.reasonOptional}
            rows={2}
            maxLength={300}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Fields>
      )}
    </Screen>
  );
}

/** Qo'shimcha dars (guruhning jadvalidan tashqari). */
export function ExtraLessonView(p: {
  groups: readonly Option[];
  rooms: readonly Option[];
  initial: LessonWhen;
  today: string;
  saving: boolean;
  onSave: (v: LessonWhen & { groupId: string; topic: string | null }) => void;
}) {
  const [when, setWhen] = useState(p.initial);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [topic, setTopic] = useState('');
  useMainButton({
    text: c.save,
    disabled: groupId === null || !whenReady(when, p.today),
    loading: p.saving,
    onClick: () => groupId && p.onSave({ ...when, groupId, topic: topic.trim() || null }),
  });
  return (
    <Screen title={c.extra}>
      <WhenFields value={when} today={p.today} rooms={p.rooms} onChange={setWhen} />
      <Fields>
        <TextField
          label={c.topic}
          maxLength={200}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
      </Fields>
      <ChoiceSection
        title={c.pickGroup}
        value={groupId}
        options={p.groups.map((g) => ({ value: g.id, label: g.name }))}
        onChange={setGroupId}
      />
    </Screen>
  );
}

type Comp = 'none' | 'credit';

/** Bekor qilish (BR-5): sabab majburiy; kredit hozir yoki keyin. */
export function LessonCancelView(p: {
  saving: boolean;
  onSave: (reason: string, compensation: 'credit' | null) => void;
}) {
  const [reason, setReason] = useState('');
  const [comp, setComp] = useState<Comp>('none');
  useMainButton({
    text: c.cancel,
    disabled: reason.trim().length < 3,
    loading: p.saving,
    onClick: () => p.onSave(reason.trim(), comp === 'credit' ? 'credit' : null),
  });
  return (
    <Screen title={c.cancel}>
      <Fields footer={c.cancelHint}>
        <TextArea
          label={c.reason}
          rows={3}
          maxLength={300}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Fields>
      <ChoiceSection<Comp>
        title={c.compensation}
        value={comp}
        options={(['none', 'credit'] as const).map((value) => ({
          value,
          label: c.compensations[value],
        }))}
        onChange={setComp}
      />
    </Screen>
  );
}

type Part = 'teacher' | 'room';

/** Shu dars uchun o'rinbosar ustoz va boshqa xona (FR-ORG-6). */
export function LessonReplaceView(p: {
  teachers: readonly Option[];
  rooms: readonly Option[];
  teacherId: string | null;
  roomId: string | null;
  saving: boolean;
  onSave: (patch: { teacherId?: string | null; roomId?: string | null }) => void;
}) {
  const [part, setPart] = useState<Part>('teacher');
  const [teacherId, setTeacher] = useState(p.teacherId);
  const [roomId, setRoom] = useState(p.roomId);
  const patch = {
    ...(teacherId === p.teacherId ? {} : { teacherId }),
    ...(roomId === p.roomId ? {} : { roomId }),
  };
  useMainButton({
    text: c.save,
    disabled: Object.keys(patch).length === 0,
    loading: p.saving,
    onClick: () => p.onSave(patch),
  });
  return (
    <Screen title={c.substituteSet}>
      <Segmented<Part>
        label={c.substituteSet}
        value={part}
        options={[
          { value: 'teacher', label: c.teacher },
          { value: 'room', label: c.room },
        ]}
        onChange={setPart}
      />
      {part === 'teacher' ? (
        <ChoiceSection
          title={c.teacher}
          value={teacherId ?? DEFAULT}
          options={choices(p.teachers, c.defaultTeacher)}
          onChange={(v) => setTeacher(v || null)}
        />
      ) : (
        <ChoiceSection
          title={c.room}
          value={roomId ?? DEFAULT}
          options={choices(p.rooms, c.defaultRoom)}
          onChange={(v) => setRoom(v || null)}
        />
      )}
    </Screen>
  );
}
