import type { StudentListRow } from '@lg/contracts';
import { ForbiddenState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { useDebounced } from '../../lib/use-debounced.js';
import { type StudentFilter, StudentsView } from '../../screens/f1/students.js';
import type { StudentRow } from '../../screens/f1/types.js';
import { CreateDrawer } from './create-drawer.js';
import { useStudents } from './use-students.js';

/** Qarzdorlar/muzlatilganlar filtri — T-208 (billing) bilan qo'shiladi. */
const FILTERS: readonly StudentFilter[] = ['active', 'archived'];

const statusOf = (s: StudentListRow): StudentRow['status'] => {
  if (s.archivedAt) return 'archived';
  return s.frozen ? 'frozen' : 'active';
};

export const toRow = (s: StudentListRow): StudentRow => ({
  id: s.id,
  code: `LG-${s.code}`,
  name: s.fullName,
  groups: s.groups.map((g) => g.name),
  guardian: s.guardian?.fullName ?? null,
  guardianPhone: s.guardian?.phone ?? null,
  status: statusOf(s),
});

function StudentsScreen({ canManage }: { canManage: boolean }) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<StudentFilter>('active');
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const q = useDebounced(query.trim());
  const list = useStudents({ q, status: filter === 'archived' ? 'archived' : 'active' });
  const open = (id: string) => void navigate({ to: '/students/$id', params: { id } });
  return (
    <>
      <StudentsView
        rows={(list.data?.pages ?? []).flatMap((p) => p.items).map(toRow)}
        filter={filter}
        filters={FILTERS}
        query={query}
        loading={list.isPending}
        error={list.isError ? errorView(list.error, () => void list.refetch()) : undefined}
        onFilter={setFilter}
        onQuery={setQuery}
        onOpen={(s) => open(s.id)}
        onNew={canManage ? () => setCreating(true) : undefined}
        onLoadMore={list.hasNextPage ? () => void list.fetchNextPage() : undefined}
        loadingMore={list.isFetchingNextPage}
      />
      {creating && <CreateDrawer onCreated={open} onClose={() => setCreating(false)} />}
    </>
  );
}

/** W-05 O'quvchilar (T-105, FR-STU-5/6): ko'rish — `student.view`, yaratish — `student.manage`. */
export function StudentsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('student.view'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <StudentsScreen canManage={permissions.has('student.manage')} />;
}
