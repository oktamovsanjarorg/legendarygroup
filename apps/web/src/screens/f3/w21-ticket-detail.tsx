import type { TicketStatus } from '@lg/contracts';
import { formatDateTime, formatPhone, webMessages as t } from '@lg/i18n';
import { Badge, Button, Card, LoadingState } from '@lg/ui-web';
import { Send } from 'lucide-react';
import { useState } from 'react';
import type { TicketItem, TicketMessage } from './types.js';

const r = t.tickets.reply;
export const STATUS_TONES: Record<TicketStatus, 'warning' | 'info' | 'success' | 'muted'> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'muted',
};

function Messages({ messages }: { messages: readonly TicketMessage[] }) {
  return (
    <div className="my-4 flex flex-1 flex-col gap-3 overflow-y-auto">
      {messages.map((m) => (
        <div
          key={m.id}
          className={`flex max-w-[80%] flex-col rounded-lg border p-3 text-sm text-text ${
            m.isStaff
              ? 'self-end border-primary/20 bg-primary/10'
              : 'self-start border-border bg-surface-alt'
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-4 text-xs text-text-muted">
            <span className="font-medium">{m.sender}</span>
            <span>{formatDateTime(m.at)}</span>
          </div>
          <p className="whitespace-pre-wrap">{m.text}</p>
        </div>
      ))}
    </div>
  );
}

/** Holat o'tishlari (ticket.handle): ochiq → jarayonda → hal qilindi → yopildi; yopilgan — qayta ochish. */
const NEXT: Record<TicketStatus, readonly { to: TicketStatus; label: string }[]> = {
  open: [
    { to: 'in_progress', label: r.take },
    { to: 'closed', label: r.closeTicket },
  ],
  in_progress: [
    { to: 'resolved', label: r.resolve },
    { to: 'closed', label: r.closeTicket },
  ],
  resolved: [
    { to: 'closed', label: r.closeTicket },
    { to: 'open', label: r.reopenTicket },
  ],
  closed: [{ to: 'open', label: r.reopenTicket }],
};

export interface DetailProps {
  ticket: TicketItem;
  messages?: readonly TicketMessage[];
  onReply?: (text: string) => Promise<void>;
  onStatus?: (to: TicketStatus) => void;
  busy?: boolean;
  error?: string;
}

function Reply({ onReply, busy }: Pick<DetailProps, 'onReply' | 'busy'>) {
  const [text, setText] = useState('');
  if (!onReply) return null;
  const send = () => {
    const v = text.trim();
    if (v)
      void onReply(v).then(
        () => setText(''),
        () => undefined,
      );
  };
  return (
    <div className="flex gap-2">
      <textarea
        aria-label={r.placeholder}
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={r.placeholder}
        className="flex-1 rounded-md border border-border bg-bg p-2 text-sm outline-none focus:border-primary"
      />
      <Button onClick={send} loading={busy}>
        <Send className="size-4" aria-hidden />
        {r.send}
      </Button>
    </div>
  );
}

export function TicketDetailPane({
  ticket,
  messages,
  onReply,
  onStatus,
  busy,
  error,
}: DetailProps) {
  const sub = [
    ticket.senderPhone
      ? `${ticket.senderName} (${formatPhone(ticket.senderPhone)})`
      : ticket.senderName,
    ticket.studentName && t.tickets.student.replace('{name}', ticket.studentName),
    ticket.assignedName && t.tickets.assigned.replace('{name}', ticket.assignedName),
  ].filter(Boolean);
  return (
    <Card className="flex flex-1 flex-col p-4">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="font-semibold text-text">{ticket.topic}</h3>
          <p className="text-xs text-text-muted">{sub.join(' • ')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={STATUS_TONES[ticket.status]}>{t.tickets.status[ticket.status]}</Badge>
          <Badge tone={ticket.priority === 'high' ? 'danger' : 'muted'}>
            {t.tickets.priority[ticket.priority]}
          </Badge>
        </div>
      </div>
      {messages ? <Messages messages={messages} /> : <LoadingState rows={3} />}
      {error && (
        <p role="alert" className="mb-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <Reply onReply={onReply} busy={busy} />
        <p className="text-xs text-text-muted">{r.sentHint}</p>
        {onStatus && (
          <div className="flex flex-wrap gap-2">
            {NEXT[ticket.status].map((n) => (
              <Button key={n.to} variant="secondary" onClick={() => onStatus(n.to)} disabled={busy}>
                {n.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
