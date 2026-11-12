import { formatPhone, formatTime, webMessages as t } from '@lg/i18n';
import { Badge, Button, Card, EmptyState, PageHeader, Tabs } from '@lg/ui-web';
import { CheckCircle2, Send } from 'lucide-react';
import { useState } from 'react';
import type { TicketItem, TicketMessage, TicketPriority, TicketStatus } from './types.js';

interface Props {
  tickets: readonly TicketItem[];
  onReply?: (ticketId: string, text: string) => void;
  onCloseTicket?: (ticketId: string) => void;
}

const STATUS_TONES: Record<TicketStatus, 'warning' | 'info' | 'muted'> = {
  open: 'warning',
  inProgress: 'info',
  closed: 'muted',
};

const PRIORITY_TONES: Record<TicketPriority, 'muted' | 'danger'> = {
  normal: 'muted',
  urgent: 'danger',
};

function TicketMessagesList({ messages }: { messages: readonly TicketMessage[] }) {
  return (
    <div className="my-4 flex flex-1 flex-col gap-3 overflow-y-auto">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex flex-col max-w-[80%] rounded-lg p-3 text-sm ${
            m.isStaff
              ? 'self-end bg-primary/10 border border-primary/20 text-text'
              : 'self-start bg-surface-alt border border-border text-text'
          }`}
        >
          <div className="flex items-center justify-between gap-4 text-xs text-text-muted mb-1">
            <span className="font-medium">{m.sender}</span>
            <span>{m.time}</span>
          </div>
          <p className="whitespace-pre-wrap">{m.text}</p>
        </div>
      ))}
    </div>
  );
}

function TicketReplyForm({
  ticketId,
  isClosed,
  onReply,
  onClose,
}: {
  ticketId: string;
  isClosed: boolean;
  onReply?: (id: string, text: string) => void;
  onClose?: (id: string) => void;
}) {
  const [replyText, setReplyText] = useState('');

  const handleSend = () => {
    if (!replyText.trim()) return;
    onReply?.(ticketId, replyText);
    setReplyText('');
  };

  return (
    <div className="border-t border-border pt-3">
      <div className="flex gap-2">
        <textarea
          rows={2}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={t.tickets.reply.placeholder}
          className="flex-1 rounded-md border border-border bg-bg p-2 text-sm outline-none focus:border-primary"
        />
        <div className="flex flex-col gap-1.5">
          <Button onClick={handleSend}>
            <Send className="size-4" aria-hidden />
            {t.tickets.reply.send}
          </Button>
          {!isClosed && (
            <Button variant="secondary" onClick={() => onClose?.(ticketId)}>
              <CheckCircle2 className="size-4" aria-hidden />
              {t.tickets.reply.closeTicket}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function TicketDetailPane({
  ticket,
  onReply,
  onClose,
}: {
  ticket: TicketItem;
  onReply?: (id: string, text: string) => void;
  onClose?: (id: string) => void;
}) {
  return (
    <Card className="flex flex-1 flex-col p-4">
      <div className="border-b border-border pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-text">{ticket.topic}</h3>
            <p className="text-xs text-text-muted">
              {ticket.senderName} ({formatPhone(ticket.senderPhone)}) • {ticket.studentName} (
              {ticket.groupName})
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone={STATUS_TONES[ticket.status]}>{t.tickets.status[ticket.status]}</Badge>
            <Badge tone={PRIORITY_TONES[ticket.priority]}>
              {t.tickets.priority[ticket.priority]}
            </Badge>
          </div>
        </div>
      </div>

      <TicketMessagesList messages={ticket.messages} />

      <TicketReplyForm
        ticketId={ticket.id}
        isClosed={ticket.status === 'closed'}
        onReply={onReply}
        onClose={onClose}
      />
    </Card>
  );
}

function TicketSidebarList({
  tickets,
  selectedId,
  onSelect,
}: {
  tickets: readonly TicketItem[];
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="w-80 flex flex-col gap-2 overflow-y-auto">
      {tickets.map((tk) => {
        const active = tk.id === selectedId;
        return (
          <button
            key={tk.id}
            type="button"
            onClick={() => onSelect(tk.id)}
            className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
              active ? 'border-primary bg-primary/5' : 'border-border bg-bg hover:bg-surface'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-text">{tk.senderName}</span>
              <span className="text-text-muted">{formatTime(tk.date)}</span>
            </div>
            <p className="line-clamp-1 text-sm font-medium text-text">{tk.topic}</p>
            <p className="line-clamp-1 text-xs text-text-muted mt-0.5">
              {tk.messages[tk.messages.length - 1]?.text}
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-text-muted">{tk.groupName}</span>
              <Badge tone={STATUS_TONES[tk.status]}>{t.tickets.status[tk.status]}</Badge>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/** W-21 Murojaatlar (FR-RPT-7). */
export function TicketsView({ tickets, onReply, onCloseTicket }: Props) {
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const [selectedId, setSelectedId] = useState<string | null>(tickets[0]?.id ?? null);

  const filtered = tickets.filter((tk) => filter === 'all' || tk.status === filter);
  const selectedTicket = tickets.find((tk) => tk.id === selectedId) ?? filtered[0];

  const tabItems = [
    { value: 'all' as const, label: t.tickets.filters.all, count: tickets.length },
    {
      value: 'open' as const,
      label: t.tickets.filters.open,
      count: tickets.filter((tk) => tk.status === 'open').length,
    },
    {
      value: 'inProgress' as const,
      label: t.tickets.filters.inProgress,
      count: tickets.filter((tk) => tk.status === 'inProgress').length,
    },
    {
      value: 'closed' as const,
      label: t.tickets.filters.closed,
      count: tickets.filter((tk) => tk.status === 'closed').length,
    },
  ];

  return (
    <>
      <PageHeader title={t.tickets.title} description={t.tickets.subtitle} />

      <Tabs label={t.tickets.title} value={filter} items={tabItems} onChange={setFilter} />

      {filtered.length > 0 && selectedTicket ? (
        <div className="flex gap-4 min-h-[480px]">
          <TicketSidebarList
            tickets={filtered}
            selectedId={selectedTicket.id}
            onSelect={setSelectedId}
          />
          <TicketDetailPane ticket={selectedTicket} onReply={onReply} onClose={onCloseTicket} />
        </div>
      ) : (
        <EmptyState title={t.tickets.empty} hint={t.tickets.emptyHint} />
      )}
    </>
  );
}
