import type { TicketDetail, TicketItem, TicketStatus } from '@lg/contracts';
import { formatDateShort, formatTime, miniappMessages as t } from '@lg/i18n';
import {
  type ChipTone,
  EmptyState,
  InlineButton,
  ListItem,
  Section,
  Segmented,
  StatusChip,
  TextArea,
  useMainButton,
  useSecondaryButton,
} from '@lg/ui-tg';
import type { TicketFilter } from '../../data/staff-tickets.js';
import { CallLink } from './kit.js';

const c = t.staffTickets;
const TONES: Record<TicketStatus, ChipTone> = {
  open: 'warning',
  in_progress: 'info',
  resolved: 'success',
  closed: 'muted',
};
const when = (iso: string) => {
  const d = new Date(iso);
  return `${formatDateShort(d)} ${formatTime(d)}`;
};

interface ListProps {
  items: readonly TicketItem[];
  filter: TicketFilter;
  onFilter: (f: TicketFilter) => void;
  onOpen: (x: TicketItem) => void;
}

/** MS-14 Murojaatlar (T-138, FR-RPT-7). */
export function StaffTicketsView({ items, filter, onFilter, onOpen }: ListProps) {
  return (
    <main className="flex flex-col gap-3 p-2 pt-3 pb-6">
      <h1 className="px-2 text-2xl font-bold text-text">{c.title}</h1>
      <Segmented<TicketFilter>
        label={c.filterLabel}
        value={filter}
        options={[
          { value: 'active', label: c.filters.active },
          { value: 'done', label: c.filters.done },
        ]}
        onChange={onFilter}
      />
      {items.length === 0 ? (
        <EmptyState title={c.empty} hint={c.emptyHint} />
      ) : (
        <Section>
          {items.map((x) => (
            <ListItem
              key={x.id}
              title={x.subject}
              subtitle={[x.authorName, x.studentName, when(x.lastMessageAt)]
                .filter(Boolean)
                .join(' · ')}
              after={<StatusChip tone={TONES[x.status]}>{c.status[x.status]}</StatusChip>}
              chevron
              onClick={() => onOpen(x)}
            />
          ))}
        </Section>
      )}
    </main>
  );
}

function Bubble({ m }: { m: TicketDetail['messages'][number] }) {
  const mine = m.authorRole === 'staff';
  const side = mine
    ? 'self-end rounded-br-sm bg-primary/15 text-text'
    : 'self-start rounded-bl-sm bg-bg text-text';
  return (
    <li className={`flex max-w-[85%] flex-col gap-0.5 rounded-2xl px-4 py-2 ${side}`}>
      <span className="text-xs font-semibold opacity-80">{m.authorName}</span>
      <p className="whitespace-pre-wrap break-words text-base">{m.text}</p>
      <span className="self-end text-xs opacity-80">{when(m.createdAt)}</span>
    </li>
  );
}

interface TicketProps {
  ticket: TicketDetail;
  text: string;
  busy: boolean;
  onText: (v: string) => void;
  onSend: () => void;
  onStatus: (s: TicketStatus) => void;
  onCard?: () => void;
}

/** Bitta murojaat: yozishma, javob (MainButton), «Hal bo'ldi» (SecondaryButton). */
export function StaffTicketView(p: TicketProps) {
  const { ticket: x } = p;
  const closed = x.status === 'closed';
  const done = closed || x.status === 'resolved';
  useMainButton({
    text: c.send,
    visible: !closed && p.text.trim() !== '',
    loading: p.busy,
    onClick: p.onSend,
  });
  useSecondaryButton({
    text: done ? c.reopen : c.resolve,
    disabled: p.busy,
    onClick: () => p.onStatus(done ? 'in_progress' : 'resolved'),
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="flex flex-col gap-1 px-2">
        <h1 className="text-xl font-semibold text-text">{x.subject}</h1>
        <p className="text-sm text-text-muted">
          {[x.authorName, x.studentName].filter(Boolean).join(' · ')}
        </p>
        <span>
          <StatusChip tone={TONES[x.status]}>{c.status[x.status]}</StatusChip>
        </span>
      </header>
      <ul className="flex flex-col gap-2">
        {x.messages.map((m) => (
          <Bubble key={m.id} m={m} />
        ))}
      </ul>
      {!closed && (
        <TextArea
          label={c.reply}
          placeholder={c.replyPlaceholder}
          rows={3}
          value={p.text}
          maxLength={3000}
          onChange={(e) => p.onText(e.target.value)}
        />
      )}
      {x.authorPhone && <CallLink phone={x.authorPhone} />}
      {p.onCard && <InlineButton onClick={p.onCard}>{c.card}</InlineButton>}
    </main>
  );
}
