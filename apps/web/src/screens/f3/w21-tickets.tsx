import { TICKET_STATUSES, type TicketStatus } from '@lg/contracts';
import { formatDateTime, webMessages as t } from '@lg/i18n';
import { Badge, EmptyState, ErrorState, LoadingState, PageHeader, Tabs } from '@lg/ui-web';
import { useState } from 'react';
import type { TicketItem } from './types.js';
import { type DetailProps, STATUS_TONES, TicketDetailPane } from './w21-ticket-detail.js';

type LoadError = { message: string; requestId?: string; onRetry: () => void };

interface Props extends Omit<DetailProps, 'ticket'> {
  tickets: readonly TicketItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading?: boolean;
  loadError?: LoadError;
}

function Sidebar({
  tickets,
  selectedId,
  onSelect,
}: Pick<Props, 'tickets' | 'selectedId' | 'onSelect'>) {
  return (
    <div className="flex w-80 shrink-0 flex-col gap-2 overflow-y-auto">
      {tickets.map((tk) => (
        <button
          key={tk.id}
          type="button"
          onClick={() => onSelect(tk.id)}
          aria-pressed={tk.id === selectedId}
          className={`flex flex-col rounded-lg border p-3 text-left transition-colors ${
            tk.id === selectedId
              ? 'border-primary bg-primary/5'
              : 'border-border bg-bg hover:bg-surface'
          }`}
        >
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium text-text">{tk.senderName}</span>
            <span className="text-text-muted">{formatDateTime(tk.lastAt)}</span>
          </div>
          <p className="line-clamp-1 text-sm font-medium text-text">{tk.topic}</p>
          <div className="mt-2 flex justify-end">
            <Badge tone={STATUS_TONES[tk.status]}>{t.tickets.status[tk.status]}</Badge>
          </div>
        </button>
      ))}
    </div>
  );
}

/** W-21 Murojaatlar (FR-RPT-7, T-306). */
export function TicketsView({
  tickets,
  selectedId,
  onSelect,
  loading,
  loadError,
  ...detail
}: Props) {
  const [filter, setFilter] = useState<'all' | TicketStatus>('all');
  const filtered = tickets.filter((tk) => filter === 'all' || tk.status === filter);
  const selected = filtered.find((tk) => tk.id === selectedId);
  const items = [
    { value: 'all' as const, label: t.tickets.filters.all, count: tickets.length },
    ...TICKET_STATUSES.map((s) => ({
      value: s,
      label: t.tickets.filters[s],
      count: tickets.filter((tk) => tk.status === s).length,
    })),
  ];
  const body = loadError ? (
    <ErrorState {...loadError} />
  ) : loading ? (
    <LoadingState rows={5} />
  ) : filtered.length === 0 ? (
    <EmptyState title={t.tickets.empty} hint={t.tickets.emptyHint} />
  ) : (
    <div className="flex min-h-[480px] gap-4">
      <Sidebar tickets={filtered} selectedId={selected?.id ?? null} onSelect={onSelect} />
      {selected ? (
        <TicketDetailPane ticket={selected} {...detail} />
      ) : (
        <EmptyState title={t.tickets.select} />
      )}
    </div>
  );
  return (
    <>
      <PageHeader title={t.tickets.title} description={t.tickets.subtitle} />
      <Tabs label={t.tickets.title} value={filter} items={items} onChange={setFilter} />
      {body}
    </>
  );
}
