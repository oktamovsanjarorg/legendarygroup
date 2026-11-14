import { formatTime, miniappMessages as t } from '@lg/i18n';
import {
  AttendanceRow,
  type AttendanceMark,
  EmptyState,
  Section,
  useClosingConfirmation,
  useHaptic,
  useMainButton,
} from '@lg/ui-tg';
import { CheckCircle2, WifiOff } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
  cameCount,
  initialMarks,
  isDirty,
  type Marks,
  type RosterStudent,
  toggled,
} from './attendance-marks.js';
import { LessonHeader, type LessonInfo } from './lesson-header.js';
import { MarkSheet } from './mark-sheet.js';

export interface AttendanceViewProps {
  lesson: LessonInfo;
  students: readonly RosterStudent[];
  /** Avval saqlangan davomat (tahrirlash, BR-30). */
  saved?: Marks;
  /** Saqlanmagan qoralama (ilova yopilib qayta ochilganda tiklanadi). */
  draft?: Marks;
  saving?: boolean;
  /** Saqlangach: shu vaqtgacha tuzatsa, ota-onaga xabar ketmaydi (BR-31, 3 daqiqa). */
  quietUntil?: Date | null;
  /** Internet yo'q — lokal navbatga yozildi (FR-ATT-6). */
  queuedOffline?: boolean;
  onSave: (marks: Marks) => void;
}

function SaveNotice({
  quietUntil,
  queuedOffline,
}: Pick<AttendanceViewProps, 'quietUntil' | 'queuedOffline'>) {
  if (!quietUntil && !queuedOffline) return null;
  const Icon = queuedOffline ? WifiOff : CheckCircle2;
  const text = queuedOffline
    ? t.attendance.savedOffline
    : t.attendance.saved.replace('{time}', formatTime(quietUntil ?? new Date(0)));
  return (
    <div
      role="status"
      className={`mx-4 flex gap-2 rounded-xl p-3 text-sm ${queuedOffline ? 'bg-warning-bg text-warning' : 'bg-success-bg text-success'}`}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      {text}
    </div>
  );
}

/**
 * MT-02 Davomat (FR-ATT-1/2/7, BR-30/31). Mezon: 20 kishi, 2 kelmagan — ≤ 4 teginish
 * (darsni ochish + 2 qator + MainButton), 11-ux §5. Baho ustuni — T-301 maketida.
 */
export function AttendanceView(props: AttendanceViewProps) {
  const { lesson, students, saved, saving, onSave } = props;
  const base = useMemo(() => initialMarks(students, saved), [students, saved]);
  const [marks, setMarks] = useState<Marks>(() => ({ ...base, ...props.draft }));
  const [sheetFor, setSheetFor] = useState<RosterStudent | null>(null);
  const h = useHaptic();
  const dirty = isDirty(base, marks);
  const set = (id: string, mark: AttendanceMark) => {
    h.selection();
    setMarks((m) => ({ ...m, [id]: mark }));
  };
  useClosingConfirmation(dirty);
  useMainButton({
    text: t.attendance.save
      .replace('{present}', String(cameCount(marks)))
      .replace('{total}', String(students.length)),
    onClick: () => onSave(marks),
    loading: saving,
    visible: students.length > 0 && (dirty || !saved),
  });
  if (students.length === 0)
    return (
      <main className="flex flex-col gap-3 pb-6">
        <LessonHeader lesson={lesson} />
        <EmptyState title={t.attendance.empty} hint={t.attendance.emptyHint} />
      </main>
    );
  return (
    <main className="flex flex-col gap-3 pb-6">
      <LessonHeader lesson={lesson} />
      <SaveNotice quietUntil={props.quietUntil} queuedOffline={props.queuedOffline} />
      <div className="px-2">
        <Section footer={t.attendance.hint}>
          {students.map((s) => (
            <AttendanceRow
              key={s.id}
              name={s.name}
              mark={marks[s.id] ?? { kind: 'present' }}
              preExcused={s.preExcused}
              disabled={saving}
              onToggle={() => set(s.id, toggled(marks[s.id] ?? { kind: 'present' }))}
              onMore={() => setSheetFor(s)}
            />
          ))}
        </Section>
      </div>
      <MarkSheet
        name={sheetFor?.name ?? null}
        onClose={() => setSheetFor(null)}
        onPick={(mark) => {
          if (sheetFor) set(sheetFor.id, mark);
          setSheetFor(null);
        }}
      />
    </main>
  );
}
