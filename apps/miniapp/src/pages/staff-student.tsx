import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  type LeaveInput,
  studentManage,
  useArchiveStudent,
  useEndEnrollment,
} from '../data/staff-student.js';
import { useStudentCard } from '../data/staff.js';
import { LeaveView } from '../screens/staff/leave.js';
import { StudentCardView } from '../screens/staff/student-card.js';
import { useMe } from '../session/session.js';

const Alert = ({ error }: { error: unknown }) => (
  <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
    {errorText(error)}
  </p>
);

/** MS-05 O'quvchi kartochkasi; `student.manage` — guruhdan chiqarish va arxiv (T-144). */
export function StaffStudentPage() {
  const { id } = useParams({ from: '/staff/student/$id' });
  const me = useMe();
  const navigate = useNavigate();
  const today = useClock().today();
  const query = useStudentCard(id);
  const archive = useArchiveStudent(id);
  const canManage = me.permissions.includes('student.manage');
  const canPay = me.permissions.includes('payment.create');
  return (
    <QueryView query={query}>
      {(d) => {
        const m = studentManage(d.enrollments, d.archivedAt, today);
        return (
          <>
            {archive.isError && <Alert error={archive.error} />}
            <StudentCardView
              s={d.hit}
              guardians={d.guardians}
              onPay={
                canPay && !m.archived
                  ? () => void navigate({ to: '/staff/student/$id/pay', params: { id } })
                  : undefined
              }
              manage={
                canManage
                  ? {
                      m,
                      busy: archive.isPending,
                      onLeave: (enrollmentId) =>
                        void navigate({
                          to: '/staff/student/$id/leave/$enrollmentId',
                          params: { id, enrollmentId },
                        }),
                      onArchive: () => archive.mutate('archive'),
                      onRestore: () => archive.mutate('restore'),
                    }
                  : undefined
              }
            />
          </>
        );
      }}
    </QueryView>
  );
}

function LeaveForm(props: {
  studentId: string;
  enrollmentId: string;
  student: string;
  group: string;
  minDate: string;
}) {
  const navigate = useNavigate();
  const today = useClock().today();
  const [value, setValue] = useState<LeaveInput>({ endDate: today, reason: 'left', note: null });
  const end = useEndEnrollment(props.enrollmentId);
  const back = () => void navigate({ to: '/staff/student/$id', params: { id: props.studentId } });
  return (
    <>
      {end.isError && <Alert error={end.error} />}
      <LeaveView
        student={props.student}
        group={props.group}
        minDate={props.minDate}
        value={value}
        saving={end.isPending}
        onChange={setValue}
        onSave={() => end.mutate(value, { onSuccess: back })}
      />
    </>
  );
}

/** MS-05a Guruhdan chiqarish (T-144). */
export function StaffLeavePage() {
  const { id, enrollmentId } = useParams({ from: '/staff/student/$id/leave/$enrollmentId' });
  const query = useStudentCard(id);
  return (
    <QueryView query={query}>
      {(d) => {
        const e = d.enrollments.find((x) => x.id === enrollmentId);
        if (!e) return <p className="p-4 text-sm text-text-muted">{t.staffLeave.title}</p>;
        return (
          <LeaveForm
            studentId={id}
            enrollmentId={enrollmentId}
            student={d.hit.name}
            group={e.group.name}
            minDate={e.startDate}
          />
        );
      }}
    </QueryView>
  );
}
