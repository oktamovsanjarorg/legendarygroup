import type { TicketDetail, TicketItem, TicketStatus } from '@lg/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'tickets'] as const;
export type TicketFilter = 'active' | 'done';

const STATUSES: Record<TicketFilter, readonly TicketStatus[]> = {
  active: ['open', 'in_progress'],
  done: ['resolved', 'closed'],
};

/** Yangi (javobsiz) murojaatlar birinchi, keyin oxirgi xabar bo'yicha. */
export function sortTickets(items: readonly TicketItem[]): TicketItem[] {
  const rank = (x: TicketItem) => (x.status === 'open' ? 0 : 1);
  return [...items].sort(
    (a, b) => rank(a) - rank(b) || b.lastMessageAt.localeCompare(a.lastMessageAt),
  );
}

export function useTickets(filter: TicketFilter) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'list', filter],
    queryFn: async () => {
      const lists = await Promise.all(
        STATUSES[filter].map((s) =>
          api.request<{ items: TicketItem[] }>(`/tickets?status=${s}&limit=100`),
        ),
      );
      return sortTickets(lists.flatMap((l) => l.items));
    },
  });
}

export function useTicket(id: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'one', id],
    queryFn: () => api.request<TicketDetail>(`/tickets/${id}`),
  });
}

export function useTicketActions(id: string) {
  const api = useApi();
  const qc = useQueryClient();
  const onSettled = () => qc.invalidateQueries({ queryKey: KEY });
  const reply = useMutation({
    mutationFn: (text: string) =>
      api.request(`/tickets/${id}/messages`, { method: 'POST', body: { text } }),
    onSettled,
  });
  const status = useMutation({
    mutationFn: (s: TicketStatus) =>
      api.request(`/tickets/${id}`, { method: 'PATCH', body: { status: s } }),
    onSettled,
  });
  return { reply, status };
}
