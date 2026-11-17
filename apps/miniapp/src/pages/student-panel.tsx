import { miniappMessages as t } from '@lg/i18n';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  useCurrentStudent,
  useStudentResults,
  useStudentSchedule,
  useStudentToday,
} from '../data/student-panel.js';
import { StudentProfileView } from '../screens/student/profile.js';
import { StudentResultsView } from '../screens/student/results.js';
import { StudentTodayView } from '../screens/student/today.js';
import { ScheduleView } from '../screens/teacher/schedule.js';

/** `/students` boʻsh — Telegram oʻquvchiga bogʻlanmagan (uzilgan) holat. */
const NOT_LINKED = {
  when: (s: unknown) => s === null,
  title: t.studentPanel.notLinked,
  hint: t.studentPanel.notLinkedHint,
};

/**
 * M-STU-01 Oʻquvchi bugungi darslar sahifasi.
 */
export function StudentTodayPage() {
  const studentQuery = useCurrentStudent();

  return (
    <QueryView query={studentQuery} empty={NOT_LINKED}>
      {(student) => student && <StudentTodayInner student={student} />}
    </QueryView>
  );
}

function StudentTodayInner({ student }: { student: { id: string; fullName: string } }) {
  const query = useStudentToday(student.id);

  return (
    <QueryView query={query}>
      {(data) => (
        <StudentTodayView
          studentName={student.fullName}
          todayStatus={data.todayStatus}
          todayLessons={data.todayLessons}
          nextLesson={data.nextLesson}
        />
      )}
    </QueryView>
  );
}

/**
 * M-STU-02 Oʻquvchi haftalik dars jadvali sahifasi.
 */
export function StudentSchedulePage() {
  const clock = useClock();
  const [selected, setSelected] = useState(() => clock.today());
  const studentQuery = useCurrentStudent();

  return (
    <QueryView query={studentQuery} empty={NOT_LINKED}>
      {(student) =>
        student && (
          <StudentScheduleInner studentId={student.id} selected={selected} onSelect={setSelected} />
        )
      }
    </QueryView>
  );
}

function StudentScheduleInner({
  studentId,
  selected,
  onSelect,
}: {
  studentId: string;
  selected: string;
  onSelect: (date: string) => void;
}) {
  const query = useStudentSchedule(studentId, selected);

  return (
    <QueryView query={query}>
      {({ days, byDay }) => (
        <ScheduleView
          week={days}
          selected={selected}
          lessons={byDay(selected)}
          onSelect={onSelect}
          onOpen={() => undefined}
        />
      )}
    </QueryView>
  );
}

/**
 * M-STU-03 Oʻquvchi natijalari va testlari sahifasi.
 */
export function StudentResultsPage() {
  const studentQuery = useCurrentStudent();

  return (
    <QueryView query={studentQuery} empty={NOT_LINKED}>
      {(student) => student && <StudentResultsInner studentId={student.id} />}
    </QueryView>
  );
}

function StudentResultsInner({ studentId }: { studentId: string }) {
  const query = useStudentResults(studentId);

  return (
    <QueryView query={query}>
      {(data) => <StudentResultsView tests={data.tests} progress={data.progress} />}
    </QueryView>
  );
}

/**
 * M-STU-04 Oʻquvchi profili sahifasi.
 */
export function StudentProfilePage() {
  const navigate = useNavigate();
  const studentQuery = useCurrentStudent();

  return (
    <QueryView query={studentQuery} empty={NOT_LINKED}>
      {(student) =>
        student && (
          <StudentProfileView
            student={student}
            onSettings={() => void navigate({ to: '/settings' })}
          />
        )
      }
    </QueryView>
  );
}
