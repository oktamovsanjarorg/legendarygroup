import type { LessonDto } from '@lg/contracts';
import { formatYmd, miniappMessages as t } from '@lg/i18n';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  lessonActions,
  type LessonWhen,
  useHolidays,
  useLesson,
  useWeekLessons,
} from '../data/staff-calendar.js';
import { useStaffCall } from '../data/staff-call.js';
import { useTeachers } from '../data/staff-groups.js';
import { useGroups, useRooms } from '../data/staff-org.js';
import { addDays, weekDates } from '../data/time.js';
import { CalendarView, LessonView } from '../screens/staff/calendar.js';
import { HolidaysView } from '../screens/staff/holidays.js';
import {
  ExtraLessonView,
  LessonCancelView,
  LessonReplaceView,
  LessonWhenView,
} from '../screens/staff/lesson-forms.js';
import { ErrorNotice } from './notice.js';

const c = t.staffCalendar;
const names = (list: readonly { id: string; fullName: string }[] = []) =>
  list.map((x) => ({ id: x.id, name: x.fullName }));

function useToLesson() {
  const navigate = useNavigate();
  return (id: string) => void navigate({ to: '/staff/lessons/$id', params: { id }, replace: true });
}

/** MS-22 Darslar kalendari (T-151). */
export function StaffCalendarPage() {
  const navigate = useNavigate();
  const today = useClock().today();
  const [date, setDate] = useState(today);
  const week = weekDates(date);
  return (
    <QueryView query={useWeekLessons(date)} rows={6}>
      {(list) => (
        <CalendarView
          title={`${formatYmd(week[0] ?? date)} – ${formatYmd(week[6] ?? date)}`}
          week={week.map((d) => ({
            date: d,
            day: Number(d.slice(8)),
            busy: list.some((l) => l.date === d && l.status !== 'cancelled'),
          }))}
          selected={date}
          lessons={list
            .filter((l) => l.date === date)
            .sort((a, b) => a.startTime.localeCompare(b.startTime))}
          onSelect={setDate}
          onWeek={(step) => setDate(addDays(date, step * 7))}
          onOpen={(id) => void navigate({ to: '/staff/lessons/$id', params: { id } })}
          onExtra={() => void navigate({ to: '/staff/calendar/new' })}
        />
      )}
    </QueryView>
  );
}

export function StaffLessonPage() {
  const { id } = useParams({ from: '/staff/lessons/$id' });
  const navigate = useNavigate();
  const today = useClock().today();
  const call = useStaffCall();
  const params = { id };
  return (
    <QueryView query={useLesson(id)}>
      {(lesson) => (
        <>
          <ErrorNotice error={call.error} />
          <LessonView
            lesson={lesson}
            can={lessonActions(lesson, today)}
            busy={call.isPending}
            onAttendance={() => void navigate({ to: '/staff/lessons/$id/attendance', params })}
            onGroup={() =>
              void navigate({ to: '/staff/groups/$id', params: { id: lesson.group.id } })
            }
            onCancel={() => void navigate({ to: '/staff/lessons/$id/cancel', params })}
            onMove={() => void navigate({ to: '/staff/lessons/$id/move', params })}
            onMakeup={() => void navigate({ to: '/staff/lessons/$id/makeup', params })}
            onReplace={() => void navigate({ to: '/staff/lessons/$id/replace', params })}
            onRestore={() => call.mutate({ path: `/lessons/${id}/restore` })}
          />
        </>
      )}
    </QueryView>
  );
}

const later = (a: string, b: string) => (a > b ? a : b);
const initialWhen = (l: LessonDto, today: string): LessonWhen => ({
  date: later(l.date, today),
  startTime: l.startTime,
  endTime: l.endTime,
});

function WhenForm({ lesson, mode }: { lesson: LessonDto; mode: 'move' | 'makeup' }) {
  const toLesson = useToLesson();
  const today = useClock().today();
  const rooms = useRooms();
  const call = useStaffCall<LessonDto>();
  return (
    <>
      <ErrorNotice error={call.error ?? rooms.error} />
      <LessonWhenView
        title={c[mode]}
        initial={initialWhen(lesson, today)}
        today={today}
        rooms={rooms.data ?? []}
        withReason={mode === 'move'}
        saving={call.isPending}
        onSave={(when, reason) =>
          call.mutate(
            {
              path: `/lessons/${lesson.id}/${mode}`,
              body: mode === 'move' ? { ...when, reason } : when,
            },
            { onSuccess: (l) => toLesson(l.makeupLessonId ?? l.id) },
          )
        }
      />
    </>
  );
}

export function StaffLessonMovePage() {
  const { id } = useParams({ from: '/staff/lessons/$id/move' });
  return <QueryView query={useLesson(id)}>{(l) => <WhenForm lesson={l} mode="move" />}</QueryView>;
}

export function StaffLessonMakeupPage() {
  const { id } = useParams({ from: '/staff/lessons/$id/makeup' });
  return (
    <QueryView query={useLesson(id)}>{(l) => <WhenForm lesson={l} mode="makeup" />}</QueryView>
  );
}

export function StaffLessonCancelPage() {
  const { id } = useParams({ from: '/staff/lessons/$id/cancel' });
  const toLesson = useToLesson();
  const call = useStaffCall();
  return (
    <>
      <ErrorNotice error={call.error} />
      <LessonCancelView
        saving={call.isPending}
        onSave={(reason, compensation) =>
          call.mutate(
            { path: `/lessons/${id}/cancel`, body: { reason, compensation } },
            { onSuccess: () => toLesson(id) },
          )
        }
      />
    </>
  );
}

export function StaffLessonReplacePage() {
  const { id } = useParams({ from: '/staff/lessons/$id/replace' });
  const toLesson = useToLesson();
  const rooms = useRooms();
  const teachers = useTeachers();
  const call = useStaffCall();
  return (
    <QueryView query={useLesson(id)}>
      {(l) => (
        <>
          <ErrorNotice error={call.error ?? rooms.error ?? teachers.error} />
          <LessonReplaceView
            teachers={names(teachers.data)}
            rooms={rooms.data ?? []}
            teacherId={l.isSubstitute ? (l.teacher?.id ?? null) : null}
            roomId={l.roomOverridden ? (l.room?.id ?? null) : null}
            saving={call.isPending}
            onSave={(body) =>
              call.mutate(
                { path: `/lessons/${id}`, method: 'PATCH', body },
                { onSuccess: () => toLesson(id) },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffLessonNewPage() {
  const toLesson = useToLesson();
  const today = useClock().today();
  const rooms = useRooms();
  const call = useStaffCall<LessonDto>();
  return (
    <QueryView query={useGroups()}>
      {(groups) => (
        <>
          <ErrorNotice error={call.error ?? rooms.error} />
          <ExtraLessonView
            groups={groups}
            rooms={rooms.data ?? []}
            initial={{ date: today, startTime: '', endTime: '' }}
            today={today}
            saving={call.isPending}
            onSave={(body) =>
              call.mutate({ path: '/lessons', body }, { onSuccess: (l) => toLesson(l.id) })
            }
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffHolidaysPage() {
  const today = useClock().today();
  const [year, setYear] = useState(() => Number(today.slice(0, 4)));
  const call = useStaffCall();
  return (
    <QueryView query={useHolidays(year)}>
      {(items) => (
        <>
          <ErrorNotice error={call.error} />
          <HolidaysView
            year={year}
            today={today}
            items={items}
            saving={call.isPending}
            onYear={(s) => setYear(year + s)}
            onAdd={(body) => call.mutate({ path: '/holidays', body })}
            onDelete={(d) => call.mutate({ path: `/holidays/${d}`, method: 'DELETE' })}
          />
        </>
      )}
    </QueryView>
  );
}
