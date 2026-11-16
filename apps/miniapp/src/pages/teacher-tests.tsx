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
    <QueryView query={testsQuery}>
      {(tests) => (
        <TestsView
          groupName={groupQuery.data?.group.name ?? ''}
          tests={tests}
          canManage={canManage && online}
          onCreate={handleCreate}
          onOpen={handleOpen}
        />
      )}
    </QueryView>
  );
}
