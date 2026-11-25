import type { EnrollmentDto } from '@lg/contracts';
import { useNavigate, useParams } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { useStaffCall } from '../data/staff-call.js';
import { useGroups } from '../data/staff-org.js';
import { useStudentCard } from '../data/staff.js';
import { addDays } from '../data/time.js';
import {
  EnrollmentView,
  EnrollView,
  FreezeView,
  TransferView,
} from '../screens/staff/student-enroll.js';
import { useMe } from '../session/session.js';
import { ErrorNotice } from './notice.js';
import { useToStudent } from './staff-student-profile.js';

/** Bitta a'zolik (kartochka ma'lumotidan). */
function WithEnrollment(p: {
  id: string;
  enrollmentId: string;
  children: (e: EnrollmentDto, student: string) => ReactNode;
}) {
  return (
    <QueryView query={useStudentCard(p.id)}>
      {(d) => {
        const e = d.enrollments.find((x) => x.id === p.enrollmentId);
        return e ? p.children(e, d.student.fullName) : null;
      }}
    </QueryView>
  );
}

/** MS-23a A'zolik (T-152). */
export function StaffEnrollmentPage() {
  const params = useParams({ from: '/staff/student/$id/enrollment/$enrollmentId' });
  const navigate = useNavigate();
  const today = useClock().today();
  const { permissions } = useMe();
  const call = useStaffCall();
  const base = `/enrollments/${params.enrollmentId}/freezes`;
  return (
    <>
      <ErrorNotice error={call.error} />
      <WithEnrollment {...params}>
        {(e, student) => (
          <EnrollmentView
            student={student}
            e={e}
            today={today}
            canManage={permissions.includes('student.manage')}
            busy={call.isPending}
            onTransfer={() =>
              void navigate({ to: '/staff/student/$id/transfer/$enrollmentId', params })
            }
            onFreeze={() =>
              void navigate({ to: '/staff/student/$id/freeze/$enrollmentId', params })
            }
            onLeave={() => void navigate({ to: '/staff/student/$id/leave/$enrollmentId', params })}
            onDiscount={
              permissions.includes('discount.grant')
                ? () => void navigate({ to: '/staff/student/$id/discount/$enrollmentId', params })
                : undefined
            }
            onFreezeEnd={(f) =>
              call.mutate({ path: `${base}/${f}/end`, body: { to: addDays(today, -1) } })
            }
            onFreezeCancel={(f) => call.mutate({ path: `${base}/${f}`, method: 'DELETE' })}
          />
        )}
      </WithEnrollment>
    </>
  );
}

export function StaffEnrollPage() {
  const { id } = useParams({ from: '/staff/student/$id/enroll' });
  const toStudent = useToStudent();
  const today = useClock().today();
  const card = useStudentCard(id);
  const call = useStaffCall();
  const taken = new Set(
    (card.data?.enrollments ?? []).filter((e) => e.endReason === null).map((e) => e.group.id),
  );
  return (
    <QueryView query={useGroups()}>
      {(groups) => (
        <>
          <ErrorNotice error={call.error ?? card.error} />
          <EnrollView
            student={card.data?.student.fullName ?? ''}
            today={today}
            groups={groups.filter((g) => !taken.has(g.id))}
            saving={call.isPending}
            onSave={(v) =>
              call.mutate(
                { path: '/enrollments', body: { studentId: id, ...v } },
                { onSuccess: () => toStudent(id) },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffTransferPage() {
  const params = useParams({ from: '/staff/student/$id/transfer/$enrollmentId' });
  const toStudent = useToStudent();
  const today = useClock().today();
  const call = useStaffCall();
  const groups = useGroups();
  return (
    <WithEnrollment {...params}>
      {(e, student) => (
        <QueryView query={groups}>
          {(list) => (
            <>
              <ErrorNotice error={call.error} />
              <TransferView
                student={student}
                fromGroup={e.group.name}
                minDate={e.startDate}
                today={today}
                groups={list.filter((g) => g.id !== e.group.id)}
                saving={call.isPending}
                onSave={(body) =>
                  call.mutate(
                    { path: `/enrollments/${e.id}/transfer`, body },
                    { onSuccess: () => toStudent(params.id) },
                  )
                }
              />
            </>
          )}
        </QueryView>
      )}
    </WithEnrollment>
  );
}

export function StaffFreezePage() {
  const params = useParams({ from: '/staff/student/$id/freeze/$enrollmentId' });
  const navigate = useNavigate();
  const today = useClock().today();
  const call = useStaffCall();
  const back = () =>
    void navigate({ to: '/staff/student/$id/enrollment/$enrollmentId', params, replace: true });
  return (
    <WithEnrollment {...params}>
      {(e, student) => (
        <>
          <ErrorNotice error={call.error} />
          <FreezeView
            student={student}
            group={e.group.name}
            minDate={e.startDate}
            today={today}
            saving={call.isPending}
            onSave={(body) =>
              call.mutate({ path: `/enrollments/${e.id}/freezes`, body }, { onSuccess: back })
            }
          />
        </>
      )}
    </WithEnrollment>
  );
}
