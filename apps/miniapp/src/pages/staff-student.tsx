import type { StudentDetail } from '@lg/contracts';
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
  useDeleteStudent,
  useEndEnrollment,
  useRemoveEnrollment,
} from '../data/staff-student.js';
import { useBillingSetupState } from '../data/staff-setup.js';
import { useStudentCard } from '../data/staff.js';
import { LeaveView } from '../screens/staff/leave.js';
import { StudentCardView } from '../screens/staff/student-card.js';
import { StudentInfo, StudentLinks } from '../screens/staff/student-edit.js';
import { useMe } from '../session/session.js';

const Alert = ({ error }: { error: unknown }) => (
  <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
    {errorText(error)}
  </p>
);

/** MS-23: ma'lumotlar va ichki ekranlar — ruxsatga qarab. */
function StudentDetails({ s }: { s: StudentDetail }) {
  const { permissions } = useMe();
  const navigate = useNavigate();
  const params = { id: s.id };
  const manage = permissions.includes('student.manage') && s.archivedAt === null;
  return (
    <>
      <StudentInfo s={s} />
      <StudentLinks
        onFinance={
          permissions.includes('billing.view')
            ? () => void navigate({ to: '/staff/student/$id/finance', params })
            : undefined
        }
        onAttendance={() => void navigate({ to: '/staff/student/$id/attendance', params })}
        onAccess={
          manage ? () => void navigate({ to: '/staff/student/$id/access', params }) : undefined
        }
        onEdit={manage ? () => void navigate({ to: '/staff/student/$id/edit', params }) : undefined}
      />
    </>
  );
}

function useManageLinks(id: string) {
  const navigate = useNavigate();
  return {
    onOpen: (enrollmentId: string) =>
      void navigate({
        to: '/staff/student/$id/enrollment/$enrollmentId',
        params: { id, enrollmentId },
      }),
    onEnroll: () => void navigate({ to: '/staff/student/$id/enroll', params: { id } }),
    onGuardian: (guardianId: string) =>
      void navigate({ to: '/staff/student/$id/guardian/$guardianId', params: { id, guardianId } }),
    onAddGuardian: () => void navigate({ to: '/staff/student/$id/guardian-new', params: { id } }),
  };
}

/** MS-05 O'quvchi kartochkasi; `student.manage` — guruhdan chiqarish va arxiv (T-144). */
export function StaffStudentPage() {
  const { id } = useParams({ from: '/staff/student/$id' });
  const me = useMe();
  const navigate = useNavigate();
  const today = useClock().today();
  const query = useStudentCard(id);
  const archive = useArchiveStudent(id);
  const remove = useDeleteStudent(id);
  const canDelete = me.permissions.includes('student.delete');
  const canManage = me.permissions.includes('student.manage');
  const canPay = me.permissions.includes('payment.create');
  const setupState = useBillingSetupState(id, canManage);
  const open = useManageLinks(id);
  const needsSetup = setupState.data?.done === false;
  return (
    <QueryView query={query}>
      {(d) => {
        const m = studentManage(d.enrollments, d.archivedAt, today);
        return (
          <>
            {archive.isError && <Alert error={archive.error} />}
            {remove.isError && <Alert error={remove.error} />}
            <StudentCardView
              s={d.hit}
              guardians={d.guardians}
              details={<StudentDetails s={d.student} />}
              onSetup={
                needsSetup && !m.archived
                  ? () => void navigate({ to: '/staff/student/$id/setup', params: { id } })
                  : undefined
              }
              onPay={
                canPay && !m.archived
                  ? () => void navigate({ to: '/staff/student/$id/pay', params: { id } })
                  : undefined
              }
              manage={
                canManage
                  ? {
                      m,
                      busy: archive.isPending || remove.isPending,
                      ...open,
                      onArchive: () => archive.mutate('archive'),
                      onRestore: () => archive.mutate('restore'),
                      ...(canDelete && {
                        onDelete: () =>
                          remove.mutate(undefined, {
                            onSuccess: () => void navigate({ to: '/staff/search', replace: true }),
                          }),
                      }),
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
  const remove = useRemoveEnrollment(props.enrollmentId);
  const back = () => void navigate({ to: '/staff/student/$id', params: { id: props.studentId } });
  return (
    <>
      {end.isError && <Alert error={end.error} />}
      {remove.isError && <Alert error={remove.error} />}
      <LeaveView
        student={props.student}
        group={props.group}
        minDate={props.minDate}
        value={value}
        saving={end.isPending || remove.isPending}
        onChange={setValue}
        onSave={() => end.mutate(value, { onSuccess: back })}
        onRemove={() => remove.mutate(undefined, { onSuccess: back })}
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
