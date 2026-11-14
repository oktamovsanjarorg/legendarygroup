import { formatMoney, miniappMessages as t, normalizeUz } from '@lg/i18n';
import { EmptyState, ListItem, SearchField, Section, StatusChip } from '@lg/ui-tg';
import { SearchX } from 'lucide-react';

export interface StudentHit {
  id: string;
  code: string;
  name: string;
  phone: string;
  groups: readonly string[];
  debt: bigint;
}

/**
 * Lokal filtr (maket va kichik ro'yxat uchun; server qidiruvi ham shu qoidada — CLAUDE.md
 * "Qidiruv"): `oʻ`/`o'`/`o‘` bir xil, katta-kichik harf farqsiz; telefon — faqat raqamlar.
 */
export function matchStudents(query: string, all: readonly StudentHit[]): StudentHit[] {
  const q = normalizeUz(query.trim());
  if (q.length < 2) return [];
  const digits = query.replace(/\D/g, '');
  return all.filter(
    (s) =>
      normalizeUz(s.name).includes(q) ||
      s.code.toLowerCase() === q ||
      (digits.length >= 4 && s.phone.replace(/\D/g, '').includes(digits)),
  );
}

interface Props {
  query: string;
  results: readonly StudentHit[];
  onQuery: (q: string) => void;
  onOpen: (s: StudentHit) => void;
}

/** MS-04 Qidiruv: ism / telefon / ID. */
export function SearchView({ query, results, onQuery, onOpen }: Props) {
  const short = query.trim().length < 2;
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{t.search.title}</h1>
      <SearchField
        value={query}
        placeholder={t.search.placeholder}
        clearLabel={t.attendance.cancel}
        onChange={onQuery}
      />
      {short ? (
        <p className="px-2 text-sm text-text-muted">{t.search.hint}</p>
      ) : results.length === 0 ? (
        <EmptyState
          title={t.search.notFound}
          hint={t.search.notFoundHint}
          action={<SearchX className="size-6 text-text-muted" aria-hidden />}
        />
      ) : (
        <Section>
          {results.map((s) => (
            <ListItem
              key={s.id}
              title={s.name}
              subtitle={`${s.code} · ${s.groups.join(', ')}`}
              after={
                s.debt > 0n ? (
                  <StatusChip tone="danger">{formatMoney(-s.debt)}</StatusChip>
                ) : undefined
              }
              chevron
              onClick={() => onOpen(s)}
            />
          ))}
        </Section>
      )}
    </main>
  );
}
