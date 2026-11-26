import { miniappMessages as t } from '@lg/i18n';
import { useHaptic } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useAssistantDraft } from '../data/assistant.js';
import { QueryView } from '../data/query-view.js';
import {
  emptyAnn,
  useAnnouncements,
  useAnnouncementStats,
  useAudience,
  useSendStaffAnnouncement,
} from '../data/staff-announcements.js';
import { useOpenGroups } from '../data/staff-new.js';
import { useCourses } from '../data/staff-org.js';
import {
  AnnFormView,
  AnnouncementsView,
  AnnouncementView,
} from '../screens/staff/announcements.js';
import { DraftNotice, ErrorNotice } from './notice.js';
import { useFilePicker } from './use-file-picker.js';

/** MS-15 Eʼlonlar (T-139). */
export function StaffAnnouncementsPage() {
  const navigate = useNavigate();
  return (
    <QueryView query={useAnnouncements()}>
      {(items) => (
        <AnnouncementsView
          items={items}
          onOpen={(x) => void navigate({ to: '/staff/announcements/$id', params: { id: x.id } })}
          onAdd={() => void navigate({ to: '/staff/announcements/new' })}
        />
      )}
    </QueryView>
  );
}

export function StaffAnnouncementPage() {
  const { id } = useParams({ from: '/staff/announcements/$id' });
  return (
    <QueryView query={useAnnouncementStats(id)}>
      {(stats) => <AnnouncementView stats={stats} />}
    </QueryView>
  );
}

export function StaffAnnouncementNewPage() {
  const navigate = useNavigate();
  const haptic = useHaptic();
  const groups = useOpenGroups();
  const courses = useCourses();
  const draft = useAssistantDraft('newAnnouncement');
  const [form, setForm] = useState(() => ({
    ...emptyAnn,
    title: draft?.title ?? '',
    body: draft?.body ?? '',
  }));
  const audience = useAudience(form);
  const picker = useFilePicker('announcement');
  const send = useSendStaffAnnouncement();
  return (
    <QueryView query={groups}>
      {(list) => (
        <>
          <DraftNotice on={!!draft} text={t.assistant.draftNote} />
          <ErrorNotice error={send.error ?? audience.error ?? courses.error} />
          {picker.input}
          <AnnFormView
            form={form}
            groups={list}
            courses={courses.data ?? []}
            count={audience.data?.recipientCount ?? null}
            file={picker.state}
            sending={send.isPending}
            onForm={setForm}
            onPickFile={picker.open}
            onSend={() =>
              send.mutate(
                { form, fileId: picker.fileId },
                {
                  onSuccess: (x) => {
                    haptic.success();
                    void navigate({
                      to: '/staff/announcements/$id',
                      params: { id: x.id },
                      replace: true,
                    });
                  },
                },
              )
            }
          />
        </>
      )}
    </QueryView>
  );
}
