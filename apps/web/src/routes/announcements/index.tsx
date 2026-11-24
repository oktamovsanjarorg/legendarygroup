import type {
  AnnouncementItem as ApiAnnouncement,
  AnnouncementPreviewResponse,
  AnnouncementTargetType,
  Course,
  GroupListItem,
} from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { ForbiddenState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import type { AnnouncementItem } from '../../screens/f3/types.js';
import {
  AnnouncementFormDrawer,
  type AnnouncementDraft,
} from '../../screens/f3/w20-announcement-form.js';
import { AnnouncementsView } from '../../screens/f3/w20-announcements.js';

const LIST = ['announcements', 'list'] as const;

export const toAnnouncement =
  (names: ReadonlyMap<string, string>) =>
  (x: ApiAnnouncement): AnnouncementItem => ({
    id: x.id,
    title: x.title,
    body: x.body,
    target: x.targetType,
    targetName: x.targetId ? (names.get(x.targetId) ?? null) : null,
    author: x.authorName,
    date: new Date(x.sentAt ?? x.createdAt),
    status: x.status,
    total: x.totalRecipients,
    sent: x.sentCount,
    failed: x.failedCount,
    blocked: x.blockedCount,
  });

/** Kurs/guruh nomlari (auditoriya va jadval uchun). Ruxsat bo'lmasa — bo'sh. */
function useTargets(canCourses: boolean) {
  const courses = useQuery({
    queryKey: ['org', 'courses', 'active'],
    queryFn: () => api.request<Course[]>('/courses?status=active'),
    enabled: canCourses,
  });
  const groups = useQuery({
    queryKey: ['groups', 'current'],
    queryFn: () => api.request<GroupListItem[]>('/groups?status=current'),
  });
  const c = (courses.data ?? []).map((x) => ({ value: x.id, label: x.name }));
  const g = (groups.data ?? []).map((x) => ({ value: x.id, label: x.name }));
  return { courses: c, groups: g, names: new Map([...c, ...g].map((o) => [o.value, o.label])) };
}

function Form({
  targets,
  onDone,
  onClose,
}: {
  targets: ReturnType<typeof useTargets>;
  onDone: () => void;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [aud, setAud] = useState<{ target: AnnouncementTargetType; id: string | null }>({
    target: 'all',
    id: null,
  });
  const ready = aud.target === 'all' || aud.target === 'debtors' || aud.id !== null;
  const preview = useQuery({
    queryKey: ['announcements', 'preview', aud.target, aud.id],
    queryFn: () =>
      api.request<AnnouncementPreviewResponse>(
        `/announcements/preview?targetType=${aud.target}${aud.id ? `&targetId=${aud.id}` : ''}`,
      ),
    enabled: ready,
  });
  const send = useMutation({
    mutationFn: (d: AnnouncementDraft) =>
      api.request('/announcements', {
        method: 'POST',
        body: {
          title: d.title,
          body: d.body,
          targetType: d.target,
          targetId: d.targetId,
        },
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: LIST });
      onDone();
    },
  });
  return (
    <AnnouncementFormDrawer
      courses={targets.courses}
      groups={targets.groups}
      recipients={ready ? (preview.data?.recipientCount ?? null) : null}
      onAudience={(target, id) => setAud({ target, id })}
      onSend={(d) => send.mutate(d)}
      onClose={onClose}
      sending={send.isPending}
      error={send.isError ? errorText(send.error) : undefined}
    />
  );
}

function Screen({ canCourses }: { canCourses: boolean }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState<string>();
  const targets = useTargets(canCourses);
  const q = useQuery({
    queryKey: LIST,
    queryFn: () => api.request<{ items: ApiAnnouncement[] }>('/announcements?limit=100'),
  });
  return (
    <AnnouncementsView
      announcements={(q.data?.items ?? []).map(toAnnouncement(targets.names))}
      onNew={() => {
        setMessage(undefined);
        setOpen(true);
      }}
      message={message}
      loading={q.isPending}
      loadError={q.isError ? errorView(q.error, () => void q.refetch()) : undefined}
      form={
        open && (
          <Form
            targets={targets}
            onClose={() => setOpen(false)}
            onDone={() => {
              setOpen(false);
              setMessage(t.announcements.form.sent);
            }}
          />
        )
      }
    />
  );
}

/** W-20 (T-305, FR-RPT-5): `announcement.send`; ustoz — faqat o'z guruhlari (API scope). */
export function AnnouncementsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('announcement.send'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <Screen canCourses={permissions.has('course.manage')} />;
}
