import { errorText } from '@lg/ui-core';
import { ForbiddenState } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useClock } from '../data/deps.js';
import { QueryView } from '../data/query-view.js';
import { useTeacherGroup } from '../data/teacher.js';
import { useCreateTest } from '../data/tests.js';
import { type NewTest, TestCreateView } from '../screens/teacher/test-create.js';
import { useMe } from '../session/session.js';
import { useOnline } from '../use-online.js';

/** MT-07a Test yaratish — faqat asosiy ustoz (Q-62); yaratilgach MT-08 importga o'tadi. */
export function TeacherTestCreatePage() {
  const { id } = useParams({ from: '/group/$id/tests/new' });
  const me = useMe();
  const clock = useClock();
  const online = useOnline();
  const navigate = useNavigate();
  const groupQuery = useTeacherGroup(id, me.id);
  const create = useCreateTest(id);

  const submit = (test: NewTest) => {
    if (!online || create.isPending) return;
    create.mutate(
      { ...test, sections: [] },
      {
        onSuccess: (created) =>
          void navigate({
            to: '/group/$id/tests/$testId/import',
            params: { id, testId: created.id },
            replace: true,
          }),
      },
    );
  };

  return (
    <QueryView query={groupQuery}>
      {(d) =>
        d?.group.role !== 'main' ? (
          <ForbiddenState onHome={() => void navigate({ to: '/' })} />
        ) : (
          <TestCreateView
            groupName={d.group.name}
            defaultDate={clock.today()}
            creating={create.isPending}
            error={create.error ? errorText(create.error) : undefined}
            onSubmit={submit}
          />
        )
      }
    </QueryView>
  );
}
