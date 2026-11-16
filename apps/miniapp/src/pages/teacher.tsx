import { miniappMessages as t } from '@lg/i18n';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import {
  useTeacherGroup,
  useTeacherGroups,
  useTeacherToday,
  useTeacherWeek,
} from '../data/teacher.js';
import { useOwnPayroll, useOwnPayrollDetail } from '../data/payroll.js';
import { GroupView } from '../screens/teacher/group.js';
import { PayrollDetailView, PayrollView } from '../screens/teacher/payroll.js';
import { GroupsView } from '../screens/teacher/groups.js';
import { ScheduleView } from '../screens/teacher/schedule.js';
import { TodayView } from '../screens/teacher/today.js';
import { useMe } from '../session/session.js';

/** Ustoz tablari (T-114) — haqiqiy API. */
export function TeacherTodayPage() {
  const navigate = useNavigate();
  const query = useTeacherToday();
  return (
    <QueryView query={query}>
      {(lessons) => (
        <TodayView
          lessons={lessons}
          onOpen={(l) => void navigate({ to: '/lesson/$id', params: { id: l.id } })}
          onSchedule={() => void navigate({ to: '/schedule' })}
        />
      )}
    </QueryView>
  );
}

export function TeacherGroupsPage() {
  const me = useMe();
  const navigate = useNavigate();
  const query = useTeacherGroups(me.id);
  return (
    <QueryView query={query}>
      {(groups) => (
        <GroupsView
          groups={groups}
          onOpen={(g) => void navigate({ to: '/group/$id', params: { id: g.id } })}
        />
      )}
    </QueryView>
  );
}

export function TeacherSchedulePage() {
  const clock = useClock();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(() => clock.today());
  const query = useTeacherWeek(selected);
  return (
    <QueryView query={query}>
      {({ days, byDay }) => (
        <ScheduleView
          week={days}
          selected={selected}
          lessons={byDay(selected)}
          onSelect={setSelected}
          onOpen={(l) => void navigate({ to: '/lesson/$id', params: { id: l.id } })}
        />
      )}
    </QueryView>
  );
}

/** MT-05 guruh sahifasi (T-114). */
export function TeacherGroupPage() {
  const { id } = useParams({ from: '/group/$id' });
  const me = useMe();
  const navigate = useNavigate();
  const query = useTeacherGroup(id, me.id);
  return (
    <QueryView query={query} empty={{ when: (d) => d === null, title: t.groups.empty }}>
      {(d) =>
        d && (
          <GroupView
            group={d.group}
            students={d.students}
            onStudent={(st) =>
              void navigate({
                to: '/group/$groupId/student/$id',
                params: { groupId: id, id: st.id },
              })
            }
            onTests={() => void navigate({ to: '/group/$id/tests', params: { id } })}
            onAnnounce={
              d.group.role === 'main'
                ? () => void navigate({ to: '/group/$id/announce', params: { id } })
                : undefined
            }
          />
        )
      }
    </QueryView>
  );
}

/** MT-11 profil va oylik (T-402, FR-SAL-4). */
export function TeacherProfilePage() {
  const navigate = useNavigate();
  const query = useOwnPayroll();
  return (
    <QueryView query={query}>
      {(months) => (
        <PayrollView
          months={months}
          onOpen={(m) => void navigate({ to: '/payroll/$id', params: { id: m.id } })}
          onSettings={() => void navigate({ to: '/settings' })}
        />
      )}
    </QueryView>
  );
}

export function TeacherPayrollPage() {
  const { id } = useParams({ from: '/payroll/$id' });
  const query = useOwnPayrollDetail(id);
  return <QueryView query={query}>{(d) => <PayrollDetailView d={d} />}</QueryView>;
}
