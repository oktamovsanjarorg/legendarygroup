import { webMessages as t } from '@lg/i18n';
import { Field, MoneyField, SelectField } from '@lg/ui-web';
import { AlertTriangle } from 'lucide-react';
import { type SlotBlock, SlotsEditor } from './slots-editor.js';

const f = t.groups.form;

/** Guruh formasi qoralamasi (matn maydonlari — string; pul — bigint). */
export interface GroupDraft {
  name: string;
  courseId: string;
  teacherId: string;
  assistantId: string;
  roomId: string;
  blocks: readonly SlotBlock[];
  maxStudents: string;
  startDate: string;
  /** `null` — kurs narxi (FR-ORG-3: kursdan meros). */
  price: bigint | null;
}

export type Option = { value: string; label: string };
export interface GroupFormOptions {
  courses: readonly Option[];
  teachers: readonly Option[];
  rooms: readonly Option[];
}
export type GroupFormErrors = Partial<Record<keyof typeof f.errors, string>>;

const withNone = (xs: readonly Option[]): Option[] => [{ value: '', label: f.none }, ...xs];

/** To'qnashuv ogohlantirishlari (FR-ORG-6): qaysi xona/ustoz, qachon, qaysi guruh bilan. */
export function ConflictList({ conflicts }: { conflicts: readonly string[] }) {
  if (conflicts.length === 0) return null;
  return (
    <ul role="alert" className="flex flex-col gap-1 rounded-md bg-warning-bg p-3 text-sm">
      {conflicts.map((c) => (
        <li key={c} className="flex gap-2 text-warning">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {c}
        </li>
      ))}
    </ul>
  );
}

type PickKey = 'courseId' | 'teacherId' | 'assistantId' | 'roomId';
type Pick = (k: PickKey) => { value: string; onChange: (e: { target: { value: string } }) => void };

function TeacherFields(p: { options: GroupFormOptions; error?: string; pick: Pick }) {
  const teachers = withNone(p.options.teachers);
  return (
    <div className="grid grid-cols-2 gap-3">
      <SelectField label={f.teacher} options={teachers} {...p.pick('teacherId')} />
      <SelectField
        label={f.assistant}
        options={teachers}
        error={p.error}
        {...p.pick('assistantId')}
      />
    </div>
  );
}

interface Props {
  d: GroupDraft;
  options: GroupFormOptions;
  errors?: GroupFormErrors;
  conflicts?: readonly string[];
  set: (patch: Partial<GroupDraft>) => void;
}

/** Guruh formasi (FR-ORG-3/4/6) — maket va haqiqiy ekran bir xil komponent. */
export function GroupFormFields({ d, options, errors = {}, conflicts = [], set }: Props) {
  const pick: Pick = (k) => ({
    value: d[k],
    onChange: (e: { target: { value: string } }) => set({ [k]: e.target.value }),
  });
  return (
    <div className="flex flex-col gap-4">
      <Field
        label={f.name}
        autoFocus
        autoComplete="off"
        value={d.name}
        onChange={(e) => set({ name: e.target.value })}
        error={errors.name}
      />
      <SelectField
        label={f.course}
        options={withNone(options.courses)}
        error={errors.courseId}
        {...pick('courseId')}
      />
      <TeacherFields options={options} error={errors.teachers} pick={pick} />
      <SelectField label={f.room} options={withNone(options.rooms)} {...pick('roomId')} />
      <SlotsEditor blocks={d.blocks} error={errors.slots} onChange={(blocks) => set({ blocks })} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label={f.capacity}
          inputMode="numeric"
          value={d.maxStudents}
          onChange={(e) => set({ maxStudents: e.target.value })}
          error={errors.maxStudents}
        />
        <Field
          label={f.startDate}
          type="date"
          value={d.startDate}
          onChange={(e) => set({ startDate: e.target.value })}
          error={errors.startDate}
        />
      </div>
      <MoneyField
        label={f.price}
        hint={f.priceHint}
        value={d.price}
        onChange={(price) => set({ price })}
      />
      <ConflictList conflicts={conflicts} />
    </div>
  );
}
