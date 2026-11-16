import { normalizeUz, webMessages as t } from '@lg/i18n';
import { Card, cn, EmptyState, PageHeader, SearchField } from '@lg/ui-web';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/auth.js';

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
    <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label={t.help.title}>
      <button
        type="button"
        role="tab"
        aria-selected={selected === 'all'}
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
          role="tab"
          aria-selected={selected === sec.id}
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

function useHashScroll(
  visibleSections: readonly SectionProps[],
  selectedSection: string,
  onSelect: (id: string) => void,
) {
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash) return;
      const target = visibleSections.find((s) => s.items.some((i) => i.id === hash));
      if (target && selectedSection !== 'all' && selectedSection !== target.id) {
        onSelect('all');
      }
      setTimeout(() => {
        const el = document.getElementById(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    };

    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [visibleSections, selectedSection, onSelect]);
}

/** W-36 «Yordam» koʻrinishi: qidiruv, boʻlim chiplari va savol kartalari. */
export function HelpView({ permissions }: { permissions: ReadonlySet<string> }) {
  const [query, setQuery] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');

  const visibleSections = useMemo(
    () => t.help.sections.filter((s) => !s.permission || permissions.has(s.permission)),
    [permissions],
  );

  useHashScroll(visibleSections, selectedSection, setSelectedSection);

  const filtered = useMemo(() => {
    const q = normalizeUz(query);
    const pool =
      selectedSection === 'all'
        ? visibleSections
        : visibleSections.filter((s) => s.id === selectedSection);
    if (!q) return pool;
    return pool.map((sec) => filterSection(sec, q)).filter((sec) => sec.items.length > 0);
  }, [visibleSections, selectedSection, query]);

  const total = useMemo(() => filtered.reduce((sum, s) => sum + s.items.length, 0), [filtered]);

  return (
    <>
      <PageHeader title={t.help.title} description={t.help.description} />
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
  return <HelpView permissions={permissions} />;
}
