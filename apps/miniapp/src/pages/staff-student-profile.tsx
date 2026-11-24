import type { StudentAccessCodeResult, StudentDetail, StudentGuardian } from '@lg/contracts';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { useStaffCall } from '../data/staff-call.js';
import { shiftPeriod } from '../data/staff-finance.js';
import {
  emptyGuardian,
  guardianBody,
  type GuardianForm,
  studentForm,
  updateStudentBody,
  useAttendanceHistory,
  useGuardianLookup,
} from '../data/staff-profile.js';
import { useStudentCard } from '../data/staff.js';
import { StudentAccessView, StudentAttendanceView } from '../screens/staff/student-access.js';
import { StudentEditView } from '../screens/staff/student-edit.js';
import { GuardianEditView, GuardianNewView } from '../screens/staff/student-guardian.js';
import { ErrorNotice } from './notice.js';

export function useToStudent() {
  const navigate = useNavigate();
  return (id: string) => void navigate({ to: '/staff/student/$id', params: { id }, replace: true });
}

function StudentEditor({ student }: { student: StudentDetail }) {
  const toStudent = useToStudent();
  const today = useClock().today();
  const call = useStaffCall();
  const [form, setForm] = useState(() => studentForm(student));
  const back = () => toStudent(student.id);
  const save = () => {
    const body = updateStudentBody(form, student);
    if (!body) return back();
    call.mutate({ path: `/students/${student.id}`, method: 'PATCH', body }, { onSuccess: back });
  };
  return (
    <>
      <ErrorNotice error={call.error} />
      <StudentEditView
        form={form}
        today={today}
        saving={call.isPending}
        onForm={setForm}
        onSave={save}
      />
    </>
  );
}

/** MS-23 Ma'lumotlarni tahrirlash (T-152). */
export function StaffStudentEditPage() {
  const { id } = useParams({ from: '/staff/student/$id/edit' });
  return (
    <QueryView query={useStudentCard(id)}>{(d) => <StudentEditor student={d.student} />}</QueryView>
  );
}

export function StaffGuardianNewPage() {
  const { id } = useParams({ from: '/staff/student/$id/guardian-new' });
  const toStudent = useToStudent();
  const call = useStaffCall();
  const [form, setForm] = useState(emptyGuardian);
  const found = useGuardianLookup(form.phone).data?.guardian ?? null;
  const body = guardianBody(form, found?.fullName ?? null);
  return (
    <>
      <ErrorNotice error={call.error} />
      <GuardianNewView
        form={form}
        found={found}
        saving={call.isPending}
        onForm={setForm}
        onSave={() =>
          call.mutate(
            { path: `/students/${id}/guardians`, body },
            { onSuccess: () => toStudent(id) },
          )
        }
      />
    </>
  );
}

const guardianForm = (g: StudentGuardian): GuardianForm => ({
  phone: g.phone ?? '',
  fullName: g.fullName,
  relation: g.relation,
  isPrimary: g.isPrimary,
  notify: g.notify,
});

function GuardianEditor({ studentId, g }: { studentId: string; g: StudentGuardian }) {
  const toStudent = useToStudent();
  const rename = useStaffCall();
  const link = useStaffCall();
  const [form, setForm] = useState(() => guardianForm(g));
  const path = `/students/${studentId}/guardians/${g.guardianId}`;
  const back = () => toStudent(studentId);
  const save = async () => {
    const { relation, isPrimary, notify } = form;
    const fullName = form.fullName.trim();
    try {
      if (fullName !== g.fullName)
        await rename.mutateAsync({
          path: `/guardians/${g.guardianId}`,
          method: 'PATCH',
          body: { fullName },
        });
      await link.mutateAsync({ path, method: 'PATCH', body: { relation, isPrimary, notify } });
      back();
    } catch {
      // Xato matni — pastdagi ErrorNotice (mutation.error).
    }
  };
  return (
    <>
      <ErrorNotice error={rename.error ?? link.error} />
      <GuardianEditView
        form={form}
        saving={rename.isPending || link.isPending}
        onForm={setForm}
        onSave={() => void save()}
        onUnlink={() => link.mutate({ path, method: 'DELETE' }, { onSuccess: back })}
      />
    </>
  );
}

export function StaffGuardianEditPage() {
  const { id, guardianId } = useParams({ from: '/staff/student/$id/guardian/$guardianId' });
  return (
    <QueryView query={useStudentCard(id)}>
      {(d) => {
        const g = d.student.guardians.find((x) => x.guardianId === guardianId);
        return g ? <GuardianEditor studentId={id} g={g} /> : null;
      }}
    </QueryView>
  );
}

/** O'quvchining Mini App kirishi (T-126). */
export function StaffStudentAccessPage() {
  const { id } = useParams({ from: '/staff/student/$id/access' });
  const code = useStaffCall<StudentAccessCodeResult>();
  const unlink = useStaffCall();
  return (
    <QueryView query={useStudentCard(id)}>
      {(d) => (
        <>
          <ErrorNotice error={code.error ?? unlink.error} />
          <StudentAccessView
            student={d.student.fullName}
            telegramLinked={d.student.telegramLinked}
            codeSet={d.student.accessCodeSet}
            newCode={code.data?.code ?? null}
            busy={code.isPending || unlink.isPending}
            onGenerate={() => code.mutate({ path: `/students/${id}/access-code` })}
            onUnlink={() => unlink.mutate({ path: `/students/${id}/telegram-unlink` })}
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffStudentAttendancePage() {
  const { id } = useParams({ from: '/staff/student/$id/attendance' });
  const current = useClock().today().slice(0, 7);
  const [period, setPeriod] = useState(current);
  return (
    <QueryView query={useAttendanceHistory(id, period)}>
      {(items) => (
        <StudentAttendanceView
          period={period}
          current={current}
          items={items}
          onStep={(s) => setPeriod((x) => shiftPeriod(x, s))}
        />
      )}
    </QueryView>
  );
}
