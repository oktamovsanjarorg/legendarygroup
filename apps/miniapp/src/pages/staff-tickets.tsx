import { useHaptic } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import {
  type TicketFilter,
  useTicket,
  useTicketActions,
  useTickets,
} from '../data/staff-tickets.js';
import { StaffTicketsView, StaffTicketView } from '../screens/staff/tickets.js';
import { ErrorNotice } from './notice.js';

/** MS-14 Murojaatlar (T-138). */
export function StaffTicketsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<TicketFilter>('active');
  const query = useTickets(filter);
  return (
    <QueryView query={query}>
      {(items) => (
        <StaffTicketsView
          items={items}
          filter={filter}
          onFilter={setFilter}
          onOpen={(x) => void navigate({ to: '/staff/tickets/$id', params: { id: x.id } })}
        />
      )}
    </QueryView>
  );
}

export function StaffTicketPage() {
  const { id } = useParams({ from: '/staff/tickets/$id' });
  const navigate = useNavigate();
  const haptic = useHaptic();
  const query = useTicket(id);
  const { reply, status } = useTicketActions(id);
  const [text, setText] = useState('');
  return (
    <QueryView query={query}>
      {(ticket) => {
        const studentId = ticket.studentId;
        return (
          <>
            <ErrorNotice error={reply.error ?? status.error} />
            <StaffTicketView
              ticket={ticket}
              text={text}
              busy={reply.isPending || status.isPending}
              onText={setText}
              onSend={() =>
                reply.mutate(text.trim(), {
                  onSuccess: () => {
                    haptic.success();
                    setText('');
                  },
                  onError: () => haptic.error(),
                })
              }
              onStatus={(s) => status.mutate(s)}
              onCard={
                studentId
                  ? () => void navigate({ to: '/staff/student/$id', params: { id: studentId } })
                  : undefined
              }
            />
          </>
        );
      }}
    </QueryView>
  );
}
