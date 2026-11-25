import type { UndeliveredNotificationItem } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'undelivered'] as const;
export type UndeliveredFilter = 'all' | 'blocked' | 'failed';
/** Bir bosishda qayta yuboriladigan eng ko'p xabar. */
export const RETRY_BATCH = 30;

const r = t.undelivered.reasons;

export function undeliveredReason(x: UndeliveredNotificationItem): string {
  if (x.status === 'blocked') return r.blocked;
  if (x.failedReason === 'NO_TELEGRAM') return r.notLinked;
  return r.error;
}

/** Bloklaganga qayta yuborish befoyda emas (ochgan bo'lishi mumkin), lekin ulanmaganga — befoyda. */
export const retryable = (items: readonly UndeliveredNotificationItem[]) =>
  items.filter((x) => x.retryable).slice(0, RETRY_BATCH);

export function useUndelivered(filter: UndeliveredFilter) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, filter],
    queryFn: () =>
      api.request<UndeliveredNotificationItem[]>(
        `/notifications/undelivered${filter === 'all' ? '' : `?status=${filter}`}`,
      ),
  });
}

export function useRetryMessages() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: readonly string[]) => {
      for (const id of ids)
        await api.request(`/notifications/undelivered/${id}/retry`, { method: 'POST' });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
