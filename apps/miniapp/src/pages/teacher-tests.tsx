import { useNavigate, useParams } from '@tanstack/react-router';
import { QueryView } from '../data/query-view.js';
import { useTeacherGroup } from '../data/teacher.js';
import { useGroupTests } from '../data/tests.js';
import { type GroupTest, TestsView } from '../screens/teacher/tests.js';
import { useMe } from '../session/session.js';
import { useOnline } from '../use-online.js';

/** MT-07 Testlar ro'yxati va yaratish (FR-GRD-3). */
export function TeacherTestsPage() {
  const { id } = useParams({ from: '/group/$id/tests' });
  const me = useMe();
  const online = useOnline();
  const navigate = useNavigate();

  const groupQuery = useTeacherGroup(id, me.id);
  const testsQuery = useGroupTests(id);

  const canManage = groupQuery.data?.group.role === 'main';

  const handleCreate = () => {
    if (canManage && online) void navigate({ to: '/group/$id/tests/new', params: { id } });
  };

  const handleOpen = (test: GroupTest) => {
    void navigate({
      to: '/group/$id/tests/$testId/import',
      params: { id, testId: test.id },
    });
  };

  return (
    <TestsScreen
      query={testsQuery}
      groupName={groupQuery.data?.group.name ?? ''}
      canManage={canManage && online}
      onCreate={handleCreate}
      onOpen={handleOpen}
    />
  );
}

/** MT-07 / MS-25: ustoz va xodim uchun bir xil ro'yxat (T-154). */
export function TestsScreen(p: {
  query: ReturnType<typeof useGroupTests>;
  groupName: string;
  canManage: boolean;
  onCreate: () => void;
  onOpen: (test: GroupTest) => void;
}) {
  return (
    <QueryView query={p.query}>
      {(tests) => (
        <TestsView
          groupName={p.groupName}
          tests={tests}
          canManage={p.canManage}
          onCreate={p.onCreate}
          onOpen={p.onOpen}
        />
      )}
    </QueryView>
  );
}
