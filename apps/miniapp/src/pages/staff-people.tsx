import type { CreateStaffResult, StaffDetail, StaffRole } from '@lg/contracts';
import { useHaptic } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import { type StaffCall, useStaffCall } from '../data/staff-call.js';
import { useGroups } from '../data/staff-org.js';
import {
  createBody,
  type PersonForm,
  toggleCall,
  updateBody,
  usePeople,
  usePerson,
} from '../data/staff-people.js';
import {
  type PersonAction,
  PeopleView,
  PersonFormView,
  PersonView,
} from '../screens/staff/people.js';
import { PermissionsView } from '../screens/staff/people-permissions.js';
import { useMe } from '../session/session.js';
import { ErrorNotice } from './notice.js';

/** MS-31 Xodimlar (T-160). */
export function StaffPeoplePage() {
  const navigate = useNavigate();
  const { id } = useMe();
  return (
    <QueryView query={usePeople()}>
      {(items) => (
        <PeopleView
          items={items}
          meId={id}
          onOpen={(x) => void navigate({ to: '/staff/people/$id', params: { id: x } })}
          onAdd={() => void navigate({ to: '/staff/people/new' })}
        />
      )}
    </QueryView>
  );
}

export function StaffPersonNewPage() {
  const navigate = useNavigate();
  const haptic = useHaptic();
  const call = useStaffCall<CreateStaffResult>();
  const [form, setForm] = useState<PersonForm>({ fullName: '', phone: '+998' });
  const [role, setRole] = useState<StaffRole>('teacher');
  const save = () =>
    call.mutate(
      { path: '/staff', body: createBody(form, role) },
      {
        onSuccess: ({ id }) => {
          haptic.success();
          void navigate({ to: '/staff/people/$id', params: { id }, replace: true });
        },
        onError: () => haptic.error(),
      },
    );
  return (
    <>
      <ErrorNotice error={call.error} />
      <PersonFormView
        form={form}
        role={role}
        own={false}
        saving={call.isPending}
        onForm={setForm}
        onRole={setRole}
        onSave={save}
      />
    </>
  );
}

const actionCall = (id: string, a: PersonAction): StaffCall => {
  switch (a.kind) {
    case 'block':
      return { path: `/rbac/users/${id}/block` };
    case 'unblock':
      return { path: `/staff/${id}/unblock` };
    case 'unlink':
      return { path: `/staff/${id}/telegram/unlink` };
    case 'addRole':
      return { path: `/staff/${id}/roles`, body: { role: a.role } };
    case 'removeRole':
      return { path: `/rbac/users/${id}/roles/${a.role}`, method: 'DELETE' };
  }
};

function Person({ person }: { person: StaffDetail }) {
  const navigate = useNavigate();
  const haptic = useHaptic();
  const me = useMe();
  const call = useStaffCall();
  const groups = useGroups();
  const { id } = person;
  const act = (a: PersonAction) =>
    call.mutate(actionCall(id, a), {
      onSuccess: () => {
        haptic.success();
        // Oxirgi xodim roli olindi — kartochka endi yo'q.
        if (a.kind === 'removeRole' && person.roles.filter((r) => r !== 'guardian').length === 1)
          void navigate({ to: '/staff/people', replace: true });
      },
      onError: () => haptic.error(),
    });
  return (
    <>
      <ErrorNotice error={call.error} />
      <PersonView
        person={person}
        own={id === me.id}
        canPermissions={me.permissions.includes('staff.permissions')}
        groups={(groups.data ?? []).filter((g) => g.mainTeacher?.id === id).map((g) => g.name)}
        busy={call.isPending}
        onAction={act}
        onEdit={() => void navigate({ to: '/staff/people/$id/edit', params: { id } })}
        onPermissions={() => void navigate({ to: '/staff/people/$id/permissions', params: { id } })}
      />
    </>
  );
}

export function StaffPersonPage() {
  const { id } = useParams({ from: '/staff/people/$id' });
  return <QueryView query={usePerson(id)}>{(person) => <Person person={person} />}</QueryView>;
}

function PersonEdit({ person }: { person: StaffDetail }) {
  const navigate = useNavigate();
  const haptic = useHaptic();
  const call = useStaffCall();
  const own = useMe().id === person.id;
  const [form, setForm] = useState<PersonForm>({ fullName: person.fullName, phone: person.phone });
  const back = () =>
    void navigate({ to: '/staff/people/$id', params: { id: person.id }, replace: true });
  const save = () => {
    const body = updateBody(form, person);
    if (!body) return back();
    call.mutate(
      { path: `/staff/${person.id}`, method: 'PATCH', body },
      {
        onSuccess: () => {
          haptic.success();
          back();
        },
        onError: () => haptic.error(),
      },
    );
  };
  return (
    <>
      <ErrorNotice error={call.error} />
      <PersonFormView
        form={form}
        role={null}
        own={own}
        saving={call.isPending}
        onForm={setForm}
        onRole={() => undefined}
        onSave={save}
      />
    </>
  );
}

export function StaffPersonEditPage() {
  const { id } = useParams({ from: '/staff/people/$id/edit' });
  return <QueryView query={usePerson(id)}>{(person) => <PersonEdit person={person} />}</QueryView>;
}

export function StaffPersonPermissionsPage() {
  const { id } = useParams({ from: '/staff/people/$id/permissions' });
  const call = useStaffCall();
  const haptic = useHaptic();
  return (
    <>
      <ErrorNotice error={call.error} />
      <QueryView query={usePerson(id)}>
        {(person) => (
          <PermissionsView
            person={person}
            busy={call.isPending}
            onToggle={(r) =>
              call.mutate(toggleCall(id, r), {
                onSuccess: () => haptic.success(),
                onError: () => haptic.error(),
              })
            }
          />
        )}
      </QueryView>
    </>
  );
}
