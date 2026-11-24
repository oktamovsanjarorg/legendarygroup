import type { GroupDetail } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { useStaffCall } from '../data/staff-call.js';
import {
  conflictText,
  createGroupBody,
  emptyGroup,
  groupForm,
  matches,
  updateGroupBody,
  useGroup,
  useGroupCounts,
  useRoster,
  useTeachers,
} from '../data/staff-groups.js';
import { useCourses, useGroups, useRooms, useUpcomingLessons } from '../data/staff-org.js';
import {
  GroupFormView,
  GroupScheduleView,
  GroupTeacherView,
} from '../screens/staff/group-forms.js';
import { type GroupsFilter, GroupsView, GroupView } from '../screens/staff/groups.js';
import { useMe } from '../session/session.js';
import { ErrorNotice } from './notice.js';

const c = t.staffGroups;

/** Jadval to'qnashuvi — qaysi guruh bilan; boshqa xato — umumiy matn. */
const GroupError = ({ error }: { error: unknown }) => {
  const text = conflictText(error);
  return text ? (
    <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
      {text}
    </p>
  ) : (
    <ErrorNotice error={error} />
  );
};

function useToGroup() {
  const navigate = useNavigate();
  return (id: string) => void navigate({ to: '/staff/groups/$id', params: { id }, replace: true });
}

const later = (a: string, b: string) => (a > b ? a : b);

/** MS-12 Guruhlar (T-136). */
export function StaffGroupsPage() {
  const navigate = useNavigate();
  const canManage = useMe().permissions.includes('group.manage');
  const [filter, setFilter] = useState<GroupsFilter>('current');
  const [q, setQ] = useState('');
  const counts = useGroupCounts();
  return (
    <QueryView query={useGroups(filter)}>
      {(items) => (
        <GroupsView
          items={items.filter((g) => matches(g, q))}
          counts={counts.data?.counts ?? {}}
          filter={filter}
          query={q}
          canManage={canManage}
          onFilter={setFilter}
          onQuery={setQ}
          onOpen={(id) => void navigate({ to: '/staff/groups/$id', params: { id } })}
          onAdd={() => void navigate({ to: '/staff/groups/new' })}
        />
      )}
    </QueryView>
  );
}

export function StaffGroupPage() {
  const { id } = useParams({ from: '/staff/groups/$id' });
  const navigate = useNavigate();
  const { permissions } = useMe();
  const today = useClock().today();
  const roster = useRoster(id);
  const lessons = useUpcomingLessons(id);
  const call = useStaffCall<GroupDetail>();
  const params = { id };
  return (
    <QueryView query={useGroup(id)}>
      {(group) => (
        <>
          <GroupError error={call.error ?? roster.error ?? lessons.error} />
          <GroupView
            group={group}
            today={today}
            roster={roster.data?.items ?? []}
            lessons={lessons.data ?? []}
            canManage={permissions.includes('group.manage')}
            canEditPast={permissions.includes('attendance.edit_past')}
            busy={call.isPending}
            onEdit={() => void navigate({ to: '/staff/groups/$id/edit', params })}
            onSchedule={() => void navigate({ to: '/staff/groups/$id/schedule', params })}
            onTeacher={() => void navigate({ to: '/staff/groups/$id/teacher', params })}
            onEndTeacher={(a) =>
              call.mutate({ path: `/groups/${id}/teachers/${a}/end`, body: { to: today } })
            }
            onStatus={(status) => call.mutate({ path: `/groups/${id}/status`, body: { status } })}
            onStudent={(s) => void navigate({ to: '/staff/student/$id', params: { id: s } })}
            onLesson={(l) => void navigate({ to: '/staff/lessons/$id', params: { id: l } })}
            onAttendance={() => void navigate({ to: '/staff/groups/$id/attendance', params })}
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffGroupNewPage() {
  const toGroup = useToGroup();
  const today = useClock().today();
  const courses = useCourses();
  const rooms = useRooms();
  const teachers = useTeachers();
  const call = useStaffCall<GroupDetail>();
  const [form, setForm] = useState(() => emptyGroup(today));
  return (
    <QueryView query={courses}>
      {(list) => (
        <>
          <GroupError error={call.error ?? rooms.error ?? teachers.error} />
          <GroupFormView
            title={c.add}
            mode="create"
            startLocked={false}
            form={form}
            courses={list}
            rooms={rooms.data ?? []}
            teachers={(teachers.data ?? []).map((x) => ({ id: x.id, name: x.fullName }))}
            saving={call.isPending}
            onForm={setForm}
            onSave={() =>
              call.mutate(
                { path: '/groups', body: createGroupBody(form) },
                { onSuccess: (g) => toGroup(g.id) },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}

function GroupEditor({ group }: { group: GroupDetail }) {
  const toGroup = useToGroup();
  const rooms = useRooms();
  const call = useStaffCall<GroupDetail>();
  const [form, setForm] = useState(() => groupForm(group));
  const save = () => {
    const body = updateGroupBody(form, group);
    if (!body) return toGroup(group.id);
    call.mutate(
      { path: `/groups/${group.id}`, method: 'PATCH', body },
      { onSuccess: () => toGroup(group.id) },
    );
  };
  return (
    <>
      <GroupError error={call.error ?? rooms.error} />
      <GroupFormView
        title={group.name}
        mode="edit"
        startLocked={group.status !== 'forming'}
        form={form}
        courses={[]}
        rooms={rooms.data ?? []}
        teachers={[]}
        saving={call.isPending}
        onForm={setForm}
        onSave={save}
      />
    </>
  );
}

export function StaffGroupEditPage() {
  const { id } = useParams({ from: '/staff/groups/$id/edit' });
  return <QueryView query={useGroup(id)}>{(g) => <GroupEditor group={g} />}</QueryView>;
}

export function StaffGroupSchedulePage() {
  const { id } = useParams({ from: '/staff/groups/$id/schedule' });
  const toGroup = useToGroup();
  const today = useClock().today();
  const courses = useCourses();
  const call = useStaffCall<GroupDetail>();
  return (
    <QueryView query={useGroup(id)}>
      {(g) => (
        <>
          <GroupError error={call.error} />
          <GroupScheduleView
            initial={g.slots.map(({ weekday, startTime, endTime }) => ({
              weekday,
              startTime,
              endTime,
            }))}
            from={later(today, g.startDate)}
            durationMin={courses.data?.find((x) => x.id === g.course.id)?.lessonDurationMin ?? 90}
            saving={call.isPending}
            onSave={(from, slots) =>
              call.mutate(
                { path: `/groups/${id}/schedule`, method: 'PUT', body: { from, slots } },
                { onSuccess: () => toGroup(id) },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}

export function StaffGroupTeacherPage() {
  const { id } = useParams({ from: '/staff/groups/$id/teacher' });
  const toGroup = useToGroup();
  const today = useClock().today();
  const group = useGroup(id);
  const call = useStaffCall<GroupDetail>();
  return (
    <QueryView query={useTeachers()}>
      {(list) => (
        <>
          <GroupError error={call.error ?? group.error} />
          <GroupTeacherView
            teachers={list.map((x) => ({ id: x.id, name: x.fullName }))}
            from={later(today, group.data?.startDate ?? today)}
            saving={call.isPending}
            onSave={(body) =>
              call.mutate(
                { path: `/groups/${id}/teachers`, body },
                { onSuccess: () => toGroup(id) },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}
