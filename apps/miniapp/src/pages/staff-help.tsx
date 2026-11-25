import { useHaptic } from '@lg/ui-tg';
import { QueryView } from '../data/query-view.js';
import { useStaffCall } from '../data/staff-call.js';
import { useSessions } from '../data/staff-help.js';
import { HelpView, SessionsView } from '../screens/staff/help.js';
import { useMe } from '../session/session.js';
import { ErrorNotice } from './notice.js';

/** MS-34 Yordam (T-163). */
export function StaffHelpPage() {
  return <HelpView permissions={useMe().permissions} />;
}

export function StaffSessionsPage() {
  const haptic = useHaptic();
  const call = useStaffCall();
  return (
    <>
      <ErrorNotice error={call.error} />
      <QueryView query={useSessions()}>
        {(items) => (
          <SessionsView
            items={items}
            busy={call.isPending}
            onEnd={(id) =>
              call.mutate(
                id
                  ? { path: `/auth/sessions/${id}`, method: 'DELETE' }
                  : { path: '/auth/sessions/revoke-all' },
                { onSuccess: () => haptic.success(), onError: () => haptic.error() },
              )
            }
          />
        )}
      </QueryView>
    </>
  );
}
