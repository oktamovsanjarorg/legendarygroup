import type { DayAbsentee, UnmarkedLessonItem } from '@lg/contracts';
import { formatYmd, miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, Section, StatusChip } from '@lg/ui-tg';
import type { DayLesson, GroupMonthRow, LessonMarkState } from '../../data/staff-attendance.js';
import { EmptyRow, Screen } from './form-kit.js';
import { PeriodBar, StepBar } from './kit.js';

const c = t.staffAttendance;

const TONE = {
  cancelled: 'muted',
  noStudents: 'muted',
  notStarted: 'muted',
  marked: 'success',
  unmarked: 'danger',
} as const;

export interface AttendanceDayViewProps {
  date: string;
  today: string;
  lessons: readonly { lesson: DayLesson; state: LessonMarkState }[];
  absentees: readonly DayAbsentee[];
  oldUnmarked: readonly UnmarkedLessonItem[];
  onStep: (step: -1 | 1) => void;
  onLesson: (lessonId: string) => void;
  onStudent: (studentId: string) => void;
}

const stateText = (l: DayLesson, s: LessonMarkState) =>
  s === 'marked'
    ? c.marked.replace('{p}', String(l.came)).replace('{n}', String(l.expected))
    : c[s];

const absentText = (a: DayAbsentee) =>
  a.status === 'late'
    ? c.statuses.late.replace('{n}', String(a.lateMinutes ?? 0))
    : c.statuses[a.status];

/** MS-13 Davomat nazorati (T-137, FR-ATT-4/5): kun darslari va kelmaganlar. */
export function AttendanceDayView(p: AttendanceDayViewProps) {
  return (
    <Screen title={c.title}>
      <StepBar
        label={p.date === p.today ? `${c.today} · ${formatYmd(p.date)}` : formatYmd(p.date)}
        prevLabel={c.prevDay}
        nextLabel={c.nextDay}
        nextDisabled={p.date >= p.today}
        onStep={p.onStep}
      />
      {p.lessons.length === 0 ? (
        <EmptyState title={c.empty} />
      ) : (
        <Section title={c.lessons}>
          {p.lessons.map(({ lesson: l, state }) => (
            <ListItem
              key={l.lessonId}
              title={`${l.startTime} · ${l.groupName}`}
              subtitle={l.teacherName ?? t.staffGroups.noTeacher}
              after={<StatusChip tone={TONE[state]}>{stateText(l, state)}</StatusChip>}
              onClick={
                state === 'cancelled' || state === 'noStudents'
                  ? undefined
                  : () => p.onLesson(l.lessonId)
              }
            />
          ))}
        </Section>
      )}
      <Section title={c.absentees}>
        {p.absentees.length === 0 && <EmptyRow text={c.noAbsent} />}
        {p.absentees.map((a) => (
          <ListItem
            key={`${a.lessonId}${a.studentId}`}
            title={a.studentName}
            subtitle={a.groupName}
            after={absentText(a)}
            chevron
            onClick={() => p.onStudent(a.studentId)}
          />
        ))}
      </Section>
      {p.oldUnmarked.length > 0 && (
        <Section title={c.oldUnmarked}>
          {p.oldUnmarked.map((l) => (
            <ListItem
              key={l.lessonId}
              title={l.groupName}
              subtitle={[formatYmd(l.date), l.startTime, l.teacherName].filter(Boolean).join(' · ')}
              chevron
              onClick={() => p.onLesson(l.lessonId)}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

export interface GroupMonthViewProps {
  groupName: string;
  period: string;
  current: string;
  students: readonly GroupMonthRow[];
  lessons: readonly {
    id: string;
    date: string;
    startTime: string;
    cancelled: boolean;
    came: number;
    total: number;
  }[];
  today: string;
  onStep: (step: -1 | 1) => void;
  onStudent: (id: string) => void;
  onLesson: (id: string) => void;
}

/** Guruhning oylik davomati (W-12 mobil): o'quvchi va dars kesimida. */
export function GroupMonthView(p: GroupMonthViewProps) {
  const count = (came: number, total: number) =>
    c.marked.replace('{p}', String(came)).replace('{n}', String(total));
  const past = p.lessons.filter((l) => l.date <= p.today);
  return (
    <Screen title={p.groupName} subtitle={c.month}>
      <PeriodBar period={p.period} current={p.current} onStep={p.onStep} />
      <Section title={c.perStudent}>
        {p.students.length === 0 && <EmptyRow text={c.noStudents} />}
        {p.students.map((s) => (
          <ListItem
            key={s.id}
            title={s.name}
            after={
              s.total > 0
                ? c.came.replace('{p}', String(s.came)).replace('{n}', String(s.total))
                : c.noMarks
            }
            chevron
            onClick={() => p.onStudent(s.id)}
          />
        ))}
      </Section>
      <Section title={c.perLesson}>
        {past.length === 0 && <EmptyRow text={c.empty} />}
        {past.map((l) => (
          <ListItem
            key={l.id}
            title={`${formatYmd(l.date)} · ${l.startTime.slice(0, 5)}`}
            after={l.cancelled ? c.cancelled : l.total > 0 ? count(l.came, l.total) : c.unmarked}
            onClick={l.cancelled ? undefined : () => p.onLesson(l.id)}
          />
        ))}
      </Section>
    </Screen>
  );
}
