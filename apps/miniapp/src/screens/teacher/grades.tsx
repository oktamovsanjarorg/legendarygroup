import type { GradedKind, GradeItemInput } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import {
  EmptyState,
  Section,
  Segmented,
  useClosingConfirmation,
  useHaptic,
  useMainButton,
} from '@lg/ui-tg';
import { CheckCircle2, Star, WifiOff } from 'lucide-react';
import { useState } from 'react';
import {
  changedGrades,
  gradeKey,
  type GradeValues,
  type LessonGrades,
} from '../../data/grades-map.js';
import type { RosterStudent } from './attendance-marks.js';
import { LessonHeader, type LessonInfo } from './lesson-header.js';

const g = t.grades;

export interface GradesViewProps {
  lesson: LessonInfo;
  students: readonly RosterStudent[];
  /** Davomatda «kelmadi» belgilanganlar — xira, lekin baholash mumkin (uy vazifasi). */
  absent: ReadonlySet<string>;
  grades: LessonGrades;
  /** BR-37: muddat tugagan — faqat ko'rish. */
  locked: boolean;
  saving?: boolean;
  result?: 'saved' | 'queued' | null;
  onSave: (items: GradeItemInput[]) => void;
}

/** 0–5: oltita tugma; tanlangani to'q. */
function FivePicker(p: {
  name: string;
  value?: number;
  disabled: boolean;
  onPick: (v: number) => void;
}) {
  return (
    <div role="radiogroup" aria-label={g.pick.replace('{name}', p.name)} className="flex gap-1.5">
      {[0, 1, 2, 3, 4, 5].map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={p.value === v}
          disabled={p.disabled}
          onClick={() => p.onPick(v)}
          className={`size-10 rounded-full text-[15px] font-semibold tabular-nums transition-colors disabled:opacity-60 ${
            p.value === v ? 'bg-primary text-primary-text' : 'bg-surface-alt text-text'
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

/** 0–100: raqam maydoni. */
function HundredInput(p: {
  name: string;
  value?: number;
  disabled: boolean;
  onPick: (v: number) => void;
}) {
  return (
    <input
      type="number"
      inputMode="numeric"
      min={0}
      max={100}
      aria-label={g.pick.replace('{name}', p.name)}
      disabled={p.disabled}
      value={p.value ?? ''}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (e.target.value !== '' && Number.isInteger(n) && n >= 0 && n <= 100) p.onPick(n);
      }}
      className="h-10 w-20 rounded-xl border border-border bg-bg px-3 text-right text-base tabular-nums text-text outline-none focus:border-primary"
    />
  );
}

function Notice({ result }: { result: GradesViewProps['result'] }) {
  if (!result) return null;
  const queued = result === 'queued';
  const Icon = queued ? WifiOff : CheckCircle2;
  return (
    <div
      role="status"
      className={`mx-4 flex gap-2 rounded-xl p-3 text-sm ${queued ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      {queued ? g.savedOffline : g.saved}
    </div>
  );
}

interface GradeRowsProps {
  students: readonly RosterStudent[];
  absent: ReadonlySet<string>;
  values: GradeValues;
  kind: GradedKind;
  scale: LessonGrades['scale'];
  disabled: boolean;
  hint?: string;
  onPick: (studentId: string, v: number) => void;
}

function GradeRows(p: GradeRowsProps) {
  const Picker = p.scale === '0_5' ? FivePicker : HundredInput;
  return (
    <div className="px-2">
      <Section footer={p.hint}>
        {p.students.map((s) => (
          <div
            key={s.id}
            className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 ${p.absent.has(s.id) ? 'opacity-70' : ''}`}
          >
            <div className="min-w-0">
              <p className="truncate text-[15px] text-text">{s.name}</p>
              {p.absent.has(s.id) && <p className="text-xs text-text-muted">{g.absent}</p>}
            </div>
            <Picker
              name={s.name}
              value={p.values[gradeKey(s.id, p.kind)]}
              disabled={p.disabled}
              onPick={(v) => p.onPick(s.id, v)}
            />
          </div>
        ))}
      </Section>
    </div>
  );
}

/** MT-02b Baholar (FR-GRD-1, BR-33, BR-37): davomatdan keyin bir oqimda — dars → baho. */
export function GradesView(p: GradesViewProps) {
  const { grades } = p;
  const [kind, setKind] = useState<GradedKind | undefined>(grades.kinds[0]);
  const [values, setValues] = useState<GradeValues>(grades.saved);
  const h = useHaptic();
  const changed = changedGrades(grades.saved, values);
  useClosingConfirmation(changed.length > 0);
  useMainButton({
    text: g.save.replace('{n}', String(changed.length)),
    onClick: () => p.onSave(changed),
    loading: p.saving,
    visible: !p.locked && changed.length > 0,
  });
  if (!kind)
    return (
      <main className="flex flex-col gap-3 pb-6">
        <LessonHeader lesson={p.lesson} />
        <EmptyState
          title={g.off}
          hint={g.offHint}
          action={<Star className="size-6 text-text-muted" aria-hidden />}
        />
      </main>
    );
  const pick = (id: string, v: number) => {
    h.selection();
    setValues((cur) => ({ ...cur, [gradeKey(id, kind)]: v }));
  };
  return (
    <main className="flex flex-col gap-3 pb-6">
      <LessonHeader lesson={p.lesson} />
      <Notice result={p.result} />
      {p.locked && (
        <p className="mx-4 rounded-xl bg-surface-alt p-3 text-sm text-text">{g.locked}</p>
      )}
      {grades.kinds.length > 1 && (
        <div className="px-4">
          <Segmented
            label={g.kind}
            value={kind}
            options={grades.kinds.map((k) => ({ value: k, label: t.student.gradeKinds[k] }))}
            onChange={setKind}
          />
        </div>
      )}
      <GradeRows
        students={p.students}
        absent={p.absent}
        values={values}
        kind={kind}
        scale={grades.scale}
        disabled={p.locked || Boolean(p.saving)}
        hint={p.locked ? undefined : grades.scale === '0_5' ? g.hint : g.hint100}
        onPick={pick}
      />
    </main>
  );
}
