import { formatDateShort, formatTime, miniappMessages as t } from '@lg/i18n';
import { StatusChip, TextArea, useMainButton } from '@lg/ui-tg';
import { useState } from 'react';

export interface TicketMessage {
  id: string;
  from: 'me' | 'center';
  text: string;
  at: Date;
}

export interface Ticket {
  id: string;
  status: 'open' | 'answered';
  messages: readonly TicketMessage[];
}

function Bubble({ m }: { m: TicketMessage }) {
  const mine = m.from === 'me';
  return (
    <div
      className={`flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-4 py-2 ${mine ? 'self-end rounded-br-sm bg-primary text-primary-text' : 'self-start rounded-bl-sm bg-bg text-text'}`}
    >
      {!mine && <span className="text-xs font-semibold text-link">{t.tickets.center}</span>}
      <p className="whitespace-pre-wrap text-base">{m.text}</p>
      <span className={`self-end text-xs ${mine ? 'opacity-80' : 'text-text-muted'}`}>
        {formatDateShort(m.at)} {formatTime(m.at)}
      </span>
    </div>
  );
}

interface Props {
  tickets: readonly Ticket[];
  sending?: boolean;
  onSend: (text: string) => void;
}

/** MG-09 Murojaat (FR-RPT-7): savol → Admin'ga ticket; javob botga ham keladi. */
export function TicketsView({ tickets, sending, onSend }: Props) {
  const [text, setText] = useState('');
  useMainButton({
    text: t.tickets.send,
    onClick: () => onSend(text.trim()),
    disabled: text.trim().length < 3,
    loading: sending,
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-xl font-semibold text-text">{t.tickets.title}</h1>
      {tickets.length === 0 && <p className="px-2 text-base text-text-muted">{t.tickets.empty}</p>}
      {tickets.map((tk) => (
        <section key={tk.id} className="flex flex-col gap-2">
          <StatusChip tone={tk.status === 'open' ? 'warning' : 'success'}>
            {tk.status === 'open' ? t.tickets.open : t.tickets.answered}
          </StatusChip>
          {tk.messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
        </section>
      ))}
      <TextArea
        label={t.tickets.new}
        placeholder={t.tickets.placeholder}
        rows={3}
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
      />
    </main>
  );
}
