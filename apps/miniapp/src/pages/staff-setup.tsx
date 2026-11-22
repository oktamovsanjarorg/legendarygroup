import { errorText } from '@lg/ui-core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  type SetupGroup,
  type SetupRow,
  setupRequest,
  useBillingSetup,
  useGroupPrices,
} from '../data/staff-setup.js';
import { useStudentCard } from '../data/staff.js';
import { SetupView } from '../screens/staff/setup.js';

type Enr = { id: string; group: { id: string; name: string }; startDate: string };

function SetupForm(props: { studentId: string; student: string; enrollments: readonly Enr[] }) {
  const navigate = useNavigate();
  const today = useClock().today();
  const prices = useGroupPrices(props.enrollments.map((e) => e.group.id));
  const setup = useBillingSetup(props.studentId);
  const [rows, setRows] = useState<Record<string, SetupRow>>(() =>
    Object.fromEntries(
      props.enrollments.map((e) => [e.id, { startDate: e.startDate, unpaid: {} }]),
    ),
  );
  return (
    <QueryView query={prices}>
      {(p) => {
        const groups: SetupGroup[] = props.enrollments.map((e) => ({
          enrollmentId: e.id,
          groupId: e.group.id,
          name: e.group.name,
          price: p[e.group.id] ?? 0n,
        }));
        return (
          <>
            {setup.isError && (
              <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
                {errorText(setup.error)}
              </p>
            )}
            <SetupView
              student={props.student}
              today={today}
              groups={groups}
              rows={rows}
              saving={setup.isPending}
              onRow={(id, r) => setRows((prev) => ({ ...prev, [id]: r }))}
              onSave={() =>
                setup.mutate(setupRequest(groups, rows, today), {
                  onSuccess: () =>
                    void navigate({ to: '/staff/student/$id', params: { id: props.studentId } }),
                })
              }
            />
          </>
        );
      }}
    </QueryView>
  );
}

/** MS-05b Boshlang'ich holat (T-145): faol guruhlar bo'yicha. */
export function StaffSetupPage() {
  const { id } = useParams({ from: '/staff/student/$id/setup' });
  const today = useClock().today();
  const query = useStudentCard(id);
  return (
    <QueryView query={query}>
      {(d) => (
        <SetupForm
          studentId={id}
          student={d.hit.name}
          enrollments={d.enrollments.filter((e) => e.endDate === null || e.endDate >= today)}
        />
      )}
    </QueryView>
  );
}
