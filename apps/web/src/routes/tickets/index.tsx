import type {
  TicketDetail,
  TicketItem as ApiTicket,
  TicketMessageItem,
  TicketStatus,
} from '@lg/contracts';
import { ForbiddenState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorText, errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import type { TicketItem, TicketMessage } from '../../screens/f3/types.js';
import { TicketsView } from '../../screens/f3/w21-tickets.js';

const LIST = ['tickets', 'list'] as const;

export const toTicket = (x: ApiTicket): TicketItem => ({
  id: x.id,
  senderName: x.authorName,
  senderPhone: x.authorPhone,
  studentName: x.studentName,
  topic: x.subject,
  status: x.status,
  priority: x.priority,
  assignedName: x.assignedToName,
  lastAt: new Date(x.lastMessageAt),
});

/** Murojaat muallifi — ota-ona; boshqa yozganlar — xodim. */
export const toMessage =
  (authorId: string) =>
  (m: TicketMessageItem): TicketMessage => ({
    id: m.id,
    sender: m.authorName,
    isStaff: m.authorId !== authorId,
    text: m.text,
    at: new Date(m.createdAt),
  });

function useTicketActions(id: string | null) {
  const qc = useQueryClient();
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: LIST });
    void qc.invalidateQueries({ queryKey: ['tickets', 'detail', id] });
  };
  const reply = useMutation({
    mutationFn: (text: string) =>
      api.request(`/tickets/${id}/messages`, { method: 'POST', body: { text } }),
    onSuccess: refresh,
  });
  const status = useMutation({
    mutationFn: (to: TicketStatus) =>
      api.request(`/tickets/${id}`, { method: 'PATCH', body: { status: to } }),
    onSuccess: refresh,
  });
  const failed = reply.error ?? status.error;
  return {
    reply,
    status,
    busy: reply.isPending || status.isPending,
    error: failed ? errorText(failed) : undefined,
  };
}

function Screen() {
  const [picked, setPicked] = useState<string | null>(null);
  const list = useQuery({
    queryKey: LIST,
    queryFn: () => api.request<{ items: ApiTicket[] }>('/tickets?limit=100'),
  });
  const tickets = (list.data?.items ?? []).map(toTicket);
  const selectedId = picked ?? tickets[0]?.id ?? null;
  const detail = useQuery({
    queryKey: ['tickets', 'detail', selectedId],
    queryFn: () => api.request<TicketDetail>(`/tickets/${selectedId}`),
    enabled: selectedId !== null,
  });
  const act = useTicketActions(selectedId);
  return (
    <TicketsView
      tickets={tickets}
      selectedId={selectedId}
      onSelect={(id) => {
        setPicked(id);
        act.reply.reset();
        act.status.reset();
      }}
      messages={detail.data?.messages.map(toMessage(detail.data.authorId))}
      onReply={async (text) => {
        await act.reply.mutateAsync(text);
      }}
      onStatus={(to) => act.status.mutate(to)}
      busy={act.busy}
      error={act.error}
      loading={list.isPending}
      loadError={list.isError ? errorView(list.error, () => void list.refetch()) : undefined}
    />
  );
}

/** W-21 (T-306, FR-RPT-7): `ticket.handle` — barcha murojaatlar, javob va holat. */
export function TicketsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('ticket.handle'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <Screen />;
}
