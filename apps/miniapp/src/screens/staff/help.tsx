import type { SessionInfo } from '@lg/contracts';
import { formatDateTime, miniappMessages as t } from '@lg/i18n';
import { ListItem, SearchField, Section } from '@lg/ui-tg';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { helpFor } from '../../data/staff-help.js';
import { EmptyRow, Screen } from './form-kit.js';
import { ConfirmSheet } from './kit.js';

const c = t.staffHelp;
const s = t.staffSessions;

function Answer({ steps, note }: { steps: readonly string[]; note?: string }) {
  return (
    <li className="flex flex-col gap-2 px-4 pb-3 text-base text-text">
      <ol className="flex list-decimal flex-col gap-1 pl-5">
        {steps.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ol>
      {note && <p className="text-sm text-text-muted">{note}</p>}
    </li>
  );
}

/** MS-34 Yordam (T-163): qidiruv, savol bosilsa — qadamlar. */
export function HelpView(p: { permissions: readonly string[] }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const shown = helpFor(p.permissions, query);
  return (
    <Screen title={c.title}>
      <SearchField value={query} placeholder={c.search} clearLabel={c.clear} onChange={setQuery} />
      {shown.length === 0 && <p className="px-2 text-sm text-text-muted">{c.empty}</p>}
      {shown.map((section) => (
        <Section key={section.id} title={section.title}>
          {section.items.flatMap((i) => [
            <ListItem
              key={i.id}
              title={i.q}
              after={<ChevronDown className="size-4" aria-hidden />}
              onClick={() => setOpen((x) => (x === i.id ? null : i.id))}
            />,
            open === i.id && <Answer key={`${i.id}-a`} steps={i.steps} note={i.note} />,
          ])}
        </Section>
      ))}
    </Screen>
  );
}

/** MS-34a Brauzer sessiyalari (FR-AUTH-7). `null` — hammasi. */
export function SessionsView(p: {
  items: readonly SessionInfo[];
  busy: boolean;
  onEnd: (id: string | null) => void;
}) {
  const [ask, setAsk] = useState<{ id: string | null } | null>(null);
  return (
    <Screen title={s.title} subtitle={s.hint}>
      <Section>
        {p.items.length === 0 && <EmptyRow text={s.empty} />}
        {p.items.map((x) => (
          <ListItem
            key={x.id}
            title={x.device ?? s.unknown}
            subtitle={[formatDateTime(new Date(x.createdAt)), x.ip].filter(Boolean).join(' · ')}
            after={<span className="text-danger">{s.end}</span>}
            disabled={p.busy}
            onClick={() => setAsk({ id: x.id })}
          />
        ))}
      </Section>
      {p.items.length > 1 && (
        <Section>
          <ListItem
            title={<span className="text-danger">{s.endAll}</span>}
            disabled={p.busy}
            onClick={() => setAsk({ id: null })}
          />
        </Section>
      )}
      {ask && (
        <ConfirmSheet
          open
          danger
          title={ask.id ? s.endTitle : s.endAllTitle}
          action={ask.id ? s.end : s.endAll}
          onClose={() => setAsk(null)}
          onConfirm={() => p.onEnd(ask.id)}
        />
      )}
    </Screen>
  );
}
