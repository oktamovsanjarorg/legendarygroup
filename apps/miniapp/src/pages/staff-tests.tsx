import { errorText } from '@lg/ui-core';
import { ForbiddenState } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { useGroup } from '../data/staff-groups.js';
import { useCreateTest, useGroupTests } from '../data/tests.js';
import { TestCreateView } from '../screens/teacher/test-create.js';
import { useMe } from '../session/session.js';
import { useOnline } from '../use-online.js';
import { TestImportScreen } from './teacher-test-import.js';
import { TestsScreen } from './teacher-tests.js';

/** MS-25 Testlar (T-154): ustoz MT-07/08 oqimi bilan bir xil; boshqarish — `test.manage`. */
const useCanManage = () => useMe().permissions.includes('test.manage');

export function StaffTestsPage() {
  const { id } = useParams({ from: '/staff/groups/$id/tests' });
  const navigate = useNavigate();
  const online = useOnline();
  const canManage = useCanManage();
  const group = useGroup(id);
  return (
    <TestsScreen
      query={useGroupTests(id)}
      groupName={group.data?.name ?? ''}
      canManage={canManage && online}
      onCreate={() => void navigate({ to: '/staff/groups/$id/tests/new', params: { id } })}
      onOpen={(x) =>
        void navigate({ to: '/staff/groups/$id/tests/$testId', params: { id, testId: x.id } })
      }
    />
  );
}

export function StaffTestCreatePage() {
  const { id } = useParams({ from: '/staff/groups/$id/tests/new' });
  const navigate = useNavigate();
  const online = useOnline();
  const today = useClock().today();
  const canManage = useCanManage();
  const create = useCreateTest(id);
  if (!canManage) return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return (
    <QueryView query={useGroup(id)}>
      {(group) => (
        <TestCreateView
          groupName={group.name}
          defaultDate={today}
          creating={create.isPending}
          error={create.error ? errorText(create.error) : undefined}
          onSubmit={(test) =>
            online &&
            !create.isPending &&
            create.mutate(
              { ...test, sections: [] },
              {
                onSuccess: (x) =>
                  void navigate({
                    to: '/staff/groups/$id/tests/$testId',
                    params: { id, testId: x.id },
                    replace: true,
                  }),
              },
            )
          }
        />
      )}
    </QueryView>
  );
}

export function StaffTestPage() {
  const { id, testId } = useParams({ from: '/staff/groups/$id/tests/$testId' });
  return <TestImportScreen groupId={id} testId={testId} canManage={useCanManage()} />;
}
