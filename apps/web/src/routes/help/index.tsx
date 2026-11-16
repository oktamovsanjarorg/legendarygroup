import { normalizeUz, webMessages as t } from '@lg/i18n';
import { Button, Card, cn, EmptyState, PageHeader, SearchField } from '@lg/ui-web';
import { useLocation } from '@tanstack/react-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../auth/auth.js';
import { useStartTour } from '../../layout/app-tour.js';

interface ItemProps {
  id: string;
  q: string;
  steps: readonly string[];
  note?: string;
}

interface SectionProps {
  id: string;
  title: string;
  items: readonly ItemProps[];
}

function HelpCard({ item }: { item: ItemProps }) {
  return (
    <Card
      id={item.id}
      className="scroll-mt-6 flex flex-col justify-between gap-3 p-4 transition-shadow focus-within:ring-2 focus-within:ring-primary/40"
    >
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-medium text-text">{item.q}</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-text-muted">
          {item.steps.map((st, i) => (
            <li key={i} className="leading-relaxed">
              {st}
            </li>
          ))}
        </ol>
      </div>
      {item.note && (
        <p className="rounded-md bg-surface-alt p-2.5 text-xs text-text-muted">
          <span className="font-medium text-text">{t.help.noteTitle}</span> {item.note}
        </p>
      )}
    </Card>
  );
}

function SectionBlock({ sec }: { sec: SectionProps }) {
  return (
    <section aria-labelledby={`sec-heading-${sec.id}`} className="flex flex-col gap-4">
      <h2 id={`sec-heading-${sec.id}`} className="text-lg font-semibold text-text">
        {sec.title}
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {sec.items.map((item) => (
          <HelpCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}

function SectionChips({
  sections,
  selected,
  onSelect,
}: {
  sections: readonly { id: string; title: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label={t.help.allSections}>
      <button
        type="button"
        aria-pressed={selected === 'all'}
        onClick={() => onSelect('all')}
        className={cn(
          'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
          selected === 'all'
            ? 'bg-primary text-primary-text'
            : 'border border-border bg-surface text-text hover:bg-surface-alt',
        )}
      >
        {t.help.allSections}
      </button>
      {sections.map((sec) => (
        <button
          key={sec.id}
          type="button"
          aria-pressed={selected === sec.id}
          onClick={() => onSelect(sec.id)}
          className={cn(
            'rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
            selected === sec.id
              ? 'bg-primary text-primary-text'
              : 'border border-border bg-surface text-text hover:bg-surface-alt',
          )}
        >
          {sec.title}
        </button>
      ))}
    </div>
  );
}

function filterSection(sec: SectionProps, q: string) {
  const secMatches = normalizeUz(sec.title).includes(q);
  const matched = sec.items.filter((item) => {
    if (secMatches) return true;
    if (normalizeUz(item.q).includes(q)) return true;
    if (item.steps.some((step) => normalizeUz(step).includes(q))) return true;
    return Boolean(item.note && normalizeUz(item.note).includes(q));
  });
  return { ...sec, items: matched };
}

/**
 * `#<savol id>` bilan ochilsa — barcha boʻlimlar va oʻsha kartaga scroll. Faqat hash
 * oʻzgarganda ishlaydi: keyin chip tanlansa, hash uni qaytarib yubormaydi.
 */
function useHashScroll(hash: string, showAll: () => void) {
  const show = useRef(showAll);
  show.current = showAll;
  useEffect(() => {
    if (!hash) return;
    show.current();
    const frame = requestAnimationFrame(() =>
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash]);
}

const allowed = (permissions: ReadonlySet<string>, p?: string) => !p || permissions.has(p);

/** Ruxsatga qarab: boʻlim va savol darajasida; savoli qolmagan boʻlim — yashirin. */
function visibleHelp(permissions: ReadonlySet<string>): SectionProps[] {
  return t.help.sections
    .filter((s) => allowed(permissions, s.permission))
    .map((s) => ({ ...s, items: s.items.filter((i) => allowed(permissions, i.permission)) }))
    .filter((s) => s.items.length > 0);
}

/** Tanlangan boʻlim va qidiruv (`oʻ`/`o'` normalizatsiya) boʻyicha. */
function filterHelp(sections: readonly SectionProps[], selected: string, query: string) {
  const q = normalizeUz(query);
  const pool = selected === 'all' ? sections : sections.filter((s) => s.id === selected);
  if (!q) return pool;
  return pool.map((sec) => filterSection(sec, q)).filter((sec) => sec.items.length > 0);
}

/** W-36 «Yordam» koʻrinishi: qidiruv, boʻlim chiplari va savol kartalari. */
export function HelpView({
  permissions,
  hash = '',
  onReplayTour,
}: {
  permissions: ReadonlySet<string>;
  /** «Tanishtiruvni qayta koʻrish» (T-124). */
  onReplayTour?: () => void;
  /** Router'dagi `#` qismi (savol id), `#`siz. */
  hash?: string;
}) {
  const [query, setQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const visibleSections = useMemo(() => visibleHelp(permissions), [permissions]);

  useHashScroll(hash, () => {
    setSelectedSection('all');
    setQuery('');
  });

  const filtered = useMemo(
    () => filterHelp(visibleSections, selectedSection, query),
    [visibleSections, selectedSection, query],
  );
  const total = filtered.reduce((sum, s) => sum + s.items.length, 0);

  return (
    <>
      <PageHeader
        title={t.help.title}
        description={t.help.description}
        actions={
          onReplayTour && (
            <Button variant="secondary" onClick={onReplayTour}>
              {t.help.replayTour}
            </Button>
          )
        }
      />
      <SearchField
        value={query}
        placeholder={t.help.searchPlaceholder}
        clearLabel={t.help.clearSearch}
        onChange={setQuery}
        className="mb-6 max-w-xl"
      />
      <SectionChips
        sections={visibleSections}
        selected={selectedSection}
        onSelect={setSelectedSection}
      />
      {total === 0 ? (
        <EmptyState title={t.help.emptyTitle} hint={t.help.emptyHint} />
      ) : (
        <div className="flex flex-col gap-8">
          {filtered.map((sec) => (
            <SectionBlock key={sec.id} sec={sec} />
          ))}
        </div>
      )}
    </>
  );
}

/** W-36 «Yordam» sahifasi: har kirgan xodim uchun ochiq. */
export function HelpPage() {
  const { permissions } = useAuth();
  const hash = useLocation({ select: (l) => l.hash });
  const startTour = useStartTour();
  return <HelpView permissions={permissions} hash={hash} onReplayTour={startTour} />;
}
