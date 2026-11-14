import { formatPhone, miniappMessages as t } from '@lg/i18n';
import { ListItem, MoneyText, Section } from '@lg/ui-tg';
import { Phone } from 'lucide-react';
import type { StudentHit } from './search.js';

export interface Guardian {
  name: string;
  relation: string;
  phone: string;
  telegramLinked: boolean;
}

/** MS-05 O'quvchi kartochkasi: guruhlar, qarz, ota-ona telefoni (qo'ng'iroq — `tel:`). */
export function StudentCardView({
  s,
  guardians,
}: {
  s: StudentHit;
  guardians: readonly Guardian[];
}) {
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{s.name}</h1>
        <p className="text-sm text-text-muted">{s.code}</p>
      </header>
      <div
        className={`flex flex-col gap-1 rounded-xl p-4 ${s.debt > 0n ? 'bg-danger-bg' : 'bg-bg'}`}
      >
        <span className="text-sm text-text-muted">{t.studentCard.debt}</span>
        {s.debt > 0n ? (
          <MoneyText amount={-s.debt} className="text-2xl font-bold" />
        ) : (
          <span className="text-xl font-semibold text-success">{t.childHome.settled}</span>
        )}
      </div>
      <Section title={t.studentCard.groups}>
        {s.groups.map((g) => (
          <ListItem key={g} title={g} />
        ))}
      </Section>
      <Section title={t.studentCard.parents}>
        {guardians.map((g) => (
          <li
            key={g.phone}
            className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-0"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-base text-text">{g.name}</span>
              <span className="text-sm text-text-muted">
                {g.relation} · {formatPhone(g.phone)}
                {g.telegramLinked ? '' : ` · ${t.studentCard.noTelegram}`}
              </span>
            </span>
            <a
              href={`tel:${g.phone}`}
              aria-label={`${t.studentCard.call}: ${g.name}`}
              className="flex size-11 items-center justify-center rounded-full bg-success-bg text-success"
            >
              <Phone className="size-5" aria-hidden />
            </a>
          </li>
        ))}
      </Section>
    </main>
  );
}
