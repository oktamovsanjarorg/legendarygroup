import type { UndeliveredNotificationItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { ForbiddenState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import type { FailedMessageItem, FailedMessageReason } from '../../screens/f3/types.js';
import { FailedMessagesView } from '../../screens/f3/w22-failed-messages.js';

const KEY = ['notifications', 'undelivered'] as const;

const reasonOf = (i: UndeliveredNotificationItem): FailedMessageReason =>
  i.status === 'blocked' ? 'blocked' : i.failedReason === 'NO_TELEGRAM' ? 'notLinked' : 'error';

export const toItem = (i: UndeliveredNotificationItem): FailedMessageItem => {
  const reason = reasonOf(i);
  return {
    id: i.id,
    recipientName: i.userName,
    type: i.type,
    reason,
    detail: reason === 'error' ? i.failedReason : null,
    attempts: i.attempts,
    date: new Date(i.createdAt),
  };
};

function Screen() {
  const qc = useQueryClient();
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [message, setMessage] = useState<{ text: string; error: boolean }>();
  const q = useQuery({
    queryKey: KEY,
    queryFn: () => api.request<UndeliveredNotificationItem[]>('/notifications/undelivered'),
  });
  const items = (q.data ?? []).map(toItem);
  const retry = useMutation({
    mutationFn: async (ids: string[]) => {
      setPending(new Set(ids));
      // Ketma-ket: bir xatoda qolganlari to'xtamaydi, natija — muvaffaqiyatlilar soni.
      let ok = 0;
      let failure: unknown;
      for (const id of ids) {
        try {
          await api.request(`/notifications/undelivered/${id}/retry`, { method: 'POST', body: {} });
          ok += 1;
        } catch (e) {
          failure = e;
        }
      }
      return { ok, failure };
    },
    onSettled: () => {
      setPending(new Set());
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onSuccess: ({ ok, failure }) =>
      setMessage(
        failure
          ? { text: errorText(failure), error: true }
          : { text: t.failedMessages.retried.replace('{n}', String(ok)), error: false },
      ),
  });
  return (
    <FailedMessagesView
      messages={items}
      onRetry={(id) => retry.mutate([id])}
      onRetryAll={() =>
        retry.mutate(items.filter((i) => i.reason !== 'notLinked').map((i) => i.id))
      }
      pending={pending}
      message={message}
      loading={q.isPending}
      loadError={q.isError ? errorView(q.error, () => void q.refetch()) : undefined}
    />
  );
}

/** W-22 (T-109, FR-RPT-6): `settings.manage` (API bilan bir xil). */
export function FailedMessagesPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('settings.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <Screen />;
}
