import type { GroupListItem } from '@lg/contracts';
import { ForbiddenState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { type GroupRow, type GroupsFilter, GroupsView } from '../../screens/f1/groups.js';
import { CreateDrawer } from './create-drawer.js';
import { DetailDrawer } from './detail-drawer.js';
import { scheduleText } from './group-draft.js';
import { useFormOptions, useGroups, useStudentCounts } from './use-groups.js';

const toRow = (g: GroupListItem, size: number | undefined): GroupRow => ({
  id: g.id,
  name: g.name,
  course: g.course.name,
  teacher: g.mainTeacher?.fullName ?? null,
  schedule: scheduleText(g.slots),
  size,
  capacity: g.maxStudents,
  status: g.status,
});

type Panel = { kind: 'new' } | { kind: 'detail'; id: string; name: string } | null;

function GroupsScreen({ canManage }: { canManage: boolean }) {
  const [filter, setFilter] = useState<GroupsFilter>('current');
  const [panel, setPanel] = useState<Panel>(null);
  const groups = useGroups(filter);
  const counts = useStudentCounts();
  const form = useFormOptions(canManage);
  const close = () => setPanel(null);
  return (
    <GroupsView
      rows={(groups.data ?? []).map((g) => toRow(g, counts.data?.counts[g.id]))}
      filter={filter}
      loading={groups.isPending}
      error={groups.isError ? errorView(groups.error, () => void groups.refetch()) : undefined}
      onNew={canManage ? () => setPanel({ kind: 'new' }) : undefined}
      onFilter={setFilter}
      onOpen={(g) => setPanel({ kind: 'detail', id: g.id, name: g.name })}
    >
      {panel?.kind === 'new' && <CreateDrawer form={form} onClose={close} />}
      {panel?.kind === 'detail' && (
        <DetailDrawer
          key={panel.id}
          id={panel.id}
          name={panel.name}
          form={form}
          canManage={canManage}
          onClose={close}
        />
      )}
    </GroupsView>
  );
}

/** W-10 Guruhlar (T-103, FR-ORG-3/4/6): ko'rish — `group.view`, o'zgartirish — `group.manage`. */
export function GroupsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('group.view'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <GroupsScreen canManage={permissions.has('group.manage')} />;
}
