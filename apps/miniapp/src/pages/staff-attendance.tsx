import { miniappMessages as t } from '@lg/i18n';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { type SaveResult, useLessonAttendance, useMarkAttendance } from '../data/attendance.js';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  markState,
  perLesson,
  perStudent,
  useDayAttendance,
  useGroupMonth,
  useOldUnmarked,
} from '../data/staff-attendance.js';
import { shiftPeriod } from '../data/staff-finance.js';
import { useGroup } from '../data/staff-groups.js';
import { addDays, atTashkent } from '../data/time.js';
import { AttendanceDayView, GroupMonthView } from '../screens/staff/attendance.js';
import { AttendanceView } from '../screens/teacher/attendance.js';
import { ErrorNotice } from './notice.js';

const c = t.staffAttendance;

function useOpen() {
  const navigate = useNavigate();
  return {
    lesson: (id: string) => void navigate({ to: '/staff/lessons/$id/attendance', params: { id } }),
    student: (id: string) => void navigate({ to: '/staff/student/$id', params: { id } }),
  };
}

/** MS-13 Davomat nazorati (T-137). */
export function StaffAttendancePage() {
  const open = useOpen();
  const clock = useClock();
  const today = clock.today();
  const [date, setDate] = useState(today);
  const old = useOldUnmarked(today);
  const now = new Date(clock.nowMs());
  return (
    <QueryView query={useDayAttendance(date)} rows={8}>
      {(d) => (
        <AttendanceDayView
          date={date}
          today={today}
          lessons={d.lessons.map((lesson) => ({
            lesson,
            state: markState(lesson, atTashkent(d.date, lesson.startTime), now),
          }))}
          absentees={d.absentees}
          oldUnmarked={date === today ? (old.data ?? []) : []}
          onStep={(s) => setDate(addDays(date, s))}
          onLesson={open.lesson}
          onStudent={open.student}
        />
      )}
    </QueryView>
  );
}

export function StaffGroupAttendancePage() {
  const { id } = useParams({ from: '/staff/groups/$id/attendance' });
  const open = useOpen();
  const today = useClock().today();
  const [period, setPeriod] = useState(today.slice(0, 7));
  const group = useGroup(id);
  return (
    <QueryView query={useGroupMonth(id, period)} rows={8}>
      {(g) => (
        <GroupMonthView
          groupName={group.data?.name ?? ''}
          period={period}
          current={today.slice(0, 7)}
          students={perStudent(g)}
          lessons={perLesson(g)}
          today={today}
          onStep={(s) => setPeriod(shiftPeriod(period, s))}
          onStudent={open.student}
          onLesson={open.lesson}
        />
      )}
    </QueryView>
  );
}

/** Dars davomati (xodim): o'tgan kun — sabab majburiy (BR-30). */
export function StaffLessonAttendancePage() {
  const { id } = useParams({ from: '/staff/lessons/$id/attendance' });
  const today = useClock().today();
  const query = useLessonAttendance(id);
  const mark = useMarkAttendance(id);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<SaveResult | null>(null);
  return (
    <QueryView query={query} rows={8}>
      {(d) => (
        <>
          <ErrorNotice error={mark.error} />
          <AttendanceView
            lesson={d.lesson}
            students={d.students}
            saved={d.saved}
            saving={mark.isPending}
            readOnly={!d.canEdit}
            readOnlyText={c.locked}
            reason={d.date < today ? { value: reason, onChange: setReason } : undefined}
            quietUntil={result?.kind === 'saved' ? result.quietUntil : null}
            queuedOffline={result?.kind === 'queued'}
            onSave={(marks) =>
              mark.mutate(
                { marks, reason: d.date < today ? reason.trim() : undefined },
                { onSuccess: setResult },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}
