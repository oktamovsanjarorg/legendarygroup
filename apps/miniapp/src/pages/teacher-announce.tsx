import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { ForbiddenState } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useAnnouncementPreview, useSendAnnouncement } from '../data/announcements.js';
import { QueryView } from '../data/query-view.js';
import { useTeacherGroup } from '../data/teacher.js';
import { AnnounceView } from '../screens/teacher/announce.js';
import { useMe } from '../session/session.js';
import { useOnline } from '../use-online.js';

const FROM = '/group/$id/announce';

/** MT-10 E'lon yuborish (faqat asosiy ustoz, Q-62). */
export function TeacherAnnouncePage() {
  const { id } = useParams({ from: FROM });
  const me = useMe();
  const online = useOnline();
  const navigate = useNavigate();

  const groupQuery = useTeacherGroup(id, me.id);
  const previewQuery = useAnnouncementPreview(id);
  const sendMutation = useSendAnnouncement(id);

  if (groupQuery.data && groupQuery.data.group.role !== 'main') {
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  }

  const handleSend = (text: string) => {
    if (!online || sendMutation.isPending) return;
    const groupName = groupQuery.data?.group.name ?? '';
    const title = t.announce.groupTitle.replace('{group}', groupName);
    sendMutation.mutate(
      { title, body: text },
      {
        onSuccess: () => {
          void navigate({ to: '/group/$id', params: { id } });
        },
      },
    );
  };

  return (
    <QueryView query={previewQuery}>
      {(preview) => (
        <>
          {sendMutation.isError && (
            <p role="alert" className="mx-4 mt-3 rounded-xl bg-danger-bg p-3 text-sm text-danger">
              {errorText(sendMutation.error)}
            </p>
          )}
          <AnnounceView
            groupName={groupQuery.data?.group.name ?? ''}
            recipients={preview.recipientCount}
            sending={sendMutation.isPending}
            onAttach={() => undefined}
            onSend={handleSend}
          />
        </>
      )}
    </QueryView>
  );
}
