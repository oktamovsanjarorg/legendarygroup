import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { useTeacherGroup } from '../data/teacher.js';
import { useCreateTest, useGroupTests } from '../data/tests.js';
import { type GroupTest, TestsView } from '../screens/teacher/tests.js';
import { useMe } from '../session/session.js';
import { useOnline } from '../use-online.js';

/** MT-07 Testlar ro'yxati va yaratish (FR-GRD-3). */
export function TeacherTestsPage() {
  const { id } = useParams({ from: '/group/$id/tests' });
  const me = useMe();
  const clock = useClock();
  const online = useOnline();
  const navigate = useNavigate();

  const groupQuery = useTeacherGroup(id, me.id);
  const testsQuery = useGroupTests(id);
  const createMutation = useCreateTest(id);

  const canManage = groupQuery.data?.group.role === 'main';

  const handleCreate = () => {
    if (!canManage || !online || createMutation.isPending) return;
    const count = (testsQuery.data?.length ?? 0) + 1;
    createMutation.mutate(
      {
        title: `${t.tests.title} ${count}`,
        date: clock.today(),
        maxScore: 100,
        sections: [],
      },
      {
        onSuccess: (created) => {
          void navigate({
            to: '/group/$id/tests/$testId/import',
            params: { id, testId: created.id },
          });
        },
      },
    );
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
        <>
          {createMutation.isError && (
            <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
              {errorText(createMutation.error)}
            </p>
          )}
          <TestsView
            groupName={groupQuery.data?.group.name ?? ''}
            tests={tests}
            canManage={canManage && online}
            onCreate={handleCreate}
            onOpen={handleOpen}
          />
        </>
      )}
    </QueryView>
  );
}
