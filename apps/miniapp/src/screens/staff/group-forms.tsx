import type { SlotInput } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import {
  InlineButton,
  ListItem,
  MoneyInput,
  Section,
  Segmented,
  TextField,
  useMainButton,
} from '@lg/ui-tg';
import { X } from 'lucide-react';
import { useState } from 'react';
import { type GroupForm, groupReady, scheduleText } from '../../data/staff-groups.js';
import { EmptyRow, Fields, Screen } from './form-kit.js';
import { ChoiceSection } from './kit.js';

const c = t.staffGroups;
const NONE = '';

interface Option {
  id: string;
  name: string;
}

const choices = (list: readonly Option[], none?: string) => [
  ...(none ? [{ value: NONE, label: none }] : []),
  ...list.map((x) => ({ value: x.id, label: x.name })),
];

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const plusMinutes = (hhmm: string, n: number) => {
  const m = Math.min(minutes(hhmm) + n, 23 * 60 + 59);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const validRange = (start: string, end: string) =>
  start !== '' && end !== '' && minutes(end) - minutes(start) >= 15;

function WeekdayPicker(p: { value: readonly number[]; onToggle: (d: number) => void }) {
  return (
    <div className="grid grid-cols-7 gap-1" role="group" aria-label={c.days}>
      {t.schedule.weekdays.map((label, i) => {
        const on = p.value.includes(i + 1);
        return (
          <button
            key={label}
            type="button"
            aria-pressed={on}
            onClick={() => p.onToggle(i + 1)}
            className={`min-h-11 rounded-lg text-sm font-medium ${on ? 'bg-primary text-primary-text' : 'bg-surface-alt text-text'}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/** Haftalik jadval tahriri: kunlar + vaqt → ro'yxat. */
export function SlotsEditor(p: {
  slots: readonly SlotInput[];
  /** Kurs dars davomiyligi — tugash vaqti o'zi qo'yiladi. */
  durationMin: number;
  onChange: (slots: SlotInput[]) => void;
}) {
  const [days, setDays] = useState<readonly number[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const ok = days.length > 0 && validRange(start, end);
  const add = () => {
    const added = days.map((weekday) => ({ weekday, startTime: start, endTime: end }));
    const key = (s: SlotInput) => `${s.weekday}${s.startTime}`;
    const keep = p.slots.filter((s) => !added.some((a) => key(a) === key(s)));
    p.onChange([...keep, ...added].sort((a, b) => key(a).localeCompare(key(b))));
    setDays([]);
  };
  return (
    <>
      <Section title={c.schedule}>
        {p.slots.length === 0 && <EmptyRow text={c.noSlots} />}
        {p.slots.map((s) => (
          <ListItem
            key={`${s.weekday}${s.startTime}`}
            title={scheduleText([s])}
            after={<X className="size-5 text-danger" aria-label={c.remove} />}
            onClick={() => p.onChange(p.slots.filter((x) => x !== s))}
          />
        ))}
      </Section>
      <Fields>
        <WeekdayPicker
          value={days}
          onToggle={(d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])}
        />
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label={c.start}
            type="time"
            value={start}
            onChange={(e) => {
              setStart(e.target.value);
              if (e.target.value) setEnd(plusMinutes(e.target.value, p.durationMin));
            }}
          />
          <TextField
            label={c.end}
            type="time"
            value={end}
            error={start && end && !validRange(start, end) ? c.badTime : null}
            onChange={(e) => setEnd(e.target.value)}
          />
        </div>
        {ok && <InlineButton onClick={add}>{c.addSlot}</InlineButton>}
      </Fields>
    </>
  );
}

export interface GroupFormViewProps {
  title: string;
  mode: 'create' | 'edit';
  /** Tahrirda: boshlanish sanasi faqat yig'ilayotgan guruhda. */
  startLocked: boolean;
  form: GroupForm;
  courses: readonly (Option & { defaultMonthlyPrice: string; lessonDurationMin: number })[];
  rooms: readonly (Option & { capacity: number })[];
  teachers: readonly Option[];
  saving: boolean;
  onForm: (f: GroupForm) => void;
  onSave: () => void;
}

function MainFields(p: GroupFormViewProps) {
  const { form, onForm } = p;
  return (
    <Fields footer={p.startLocked ? c.startLocked : undefined}>
      <TextField
        label={c.name}
        autoComplete="off"
        value={form.name}
        onChange={(e) => onForm({ ...form, name: e.target.value })}
      />
      <MoneyInput
        label={c.price}
        allowZero
        hint={p.mode === 'edit' ? c.priceHint : undefined}
        value={form.price}
        onChange={(price) => onForm({ ...form, price })}
      />
      <TextField
        label={c.maxStudents}
        inputMode="numeric"
        value={form.maxStudents}
        onChange={(e) => onForm({ ...form, maxStudents: e.target.value.replace(/\D/g, '') })}
      />
      <TextField
        label={c.startDate}
        type="date"
        disabled={p.startLocked}
        value={form.startDate}
        onChange={(e) => onForm({ ...form, startDate: e.target.value })}
      />
      <TextField
        label={c.endDate}
        type="date"
        min={form.startDate}
        value={form.endDate}
        onChange={(e) => onForm({ ...form, endDate: e.target.value })}
      />
    </Fields>
  );
}

/** MS-20 Yangi guruh / tahrir (T-149). */
export function GroupFormView(p: GroupFormViewProps) {
  const { form, onForm } = p;
  const create = p.mode === 'create';
  const course = p.courses.find((x) => x.id === form.courseId);
  const size = Number(form.maxStudents) || 0;
  useMainButton({
    text: create ? c.create : c.save,
    disabled: !groupReady(form),
    loading: p.saving,
    onClick: p.onSave,
  });
  return (
    <Screen title={p.title}>
      {create && (
        <ChoiceSection
          title={c.course}
          value={form.courseId}
          options={choices(p.courses)}
          onChange={(courseId) => {
            const picked = p.courses.find((x) => x.id === courseId);
            onForm({
              ...form,
              courseId,
              price: picked ? BigInt(picked.defaultMonthlyPrice) : null,
            });
          }}
        />
      )}
      <MainFields {...p} />
      <ChoiceSection
        title={c.room}
        value={form.roomId ?? NONE}
        options={choices(
          p.rooms.filter((r) => r.capacity >= size || r.id === form.roomId),
          c.noRoom,
        )}
        onChange={(v) => onForm({ ...form, roomId: v || null })}
      />
      {create && (
        <>
          <ChoiceSection
            title={c.main}
            value={form.teacherId ?? NONE}
            options={choices(p.teachers, c.noneTeacher)}
            onChange={(v) => onForm({ ...form, teacherId: v || null })}
          />
          <SlotsEditor
            slots={form.slots}
            durationMin={course?.lessonDurationMin ?? 90}
            onChange={(slots) => onForm({ ...form, slots })}
          />
        </>
      )}
    </Screen>
  );
}

/** Jadvalni sanadan almashtirish. */
export function GroupScheduleView(p: {
  initial: readonly SlotInput[];
  from: string;
  durationMin: number;
  saving: boolean;
  onSave: (from: string, slots: SlotInput[]) => void;
}) {
  const [from, setFrom] = useState(p.from);
  const [slots, setSlots] = useState<SlotInput[]>(() => [...p.initial]);
  useMainButton({
    text: c.save,
    disabled: from < p.from,
    loading: p.saving,
    onClick: () => p.onSave(from, slots),
  });
  return (
    <Screen title={c.changeSchedule}>
      <Fields footer={c.fromHint}>
        <TextField
          label={c.fromDate}
          type="date"
          min={p.from}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </Fields>
      <SlotsEditor slots={slots} durationMin={p.durationMin} onChange={setSlots} />
    </Screen>
  );
}

/** Ustoz biriktirish: asosiy (almashtirish) yoki yordamchi. */
export function GroupTeacherView(p: {
  teachers: readonly Option[];
  from: string;
  saving: boolean;
  onSave: (v: { teacherId: string; role: 'main' | 'assistant'; from: string }) => void;
}) {
  const [role, setRole] = useState<'main' | 'assistant'>('main');
  const [from, setFrom] = useState(p.from);
  const [teacherId, setTeacherId] = useState<string | null>(null);
  useMainButton({
    text: c.save,
    disabled: teacherId === null || from < p.from,
    loading: p.saving,
    onClick: () => teacherId && p.onSave({ teacherId, role, from }),
  });
  return (
    <Screen title={c.addTeacher}>
      <Segmented
        label={c.role}
        value={role}
        options={[
          { value: 'main', label: c.main },
          { value: 'assistant', label: c.assistant },
        ]}
        onChange={setRole}
      />
      <Fields footer={role === 'main' ? c.mainHint : undefined}>
        <TextField
          label={c.fromDate}
          type="date"
          min={p.from}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
      </Fields>
      <ChoiceSection
        title={c.teacher}
        value={teacherId}
        options={choices(p.teachers)}
        onChange={setTeacherId}
      />
    </Screen>
  );
}
