import { formatPhone, miniappMessages as t } from '@lg/i18n';
import { ListItem, MoneyText, Section } from '@lg/ui-tg';
import { CalendarCog, Phone, UserPlus, Wallet } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyRow } from './form-kit.js';
import type { StudentHit } from './search.js';
import {
  ArchiveSection,
  ManageGroups,
  PastGroups,
  type StudentManageProps,
} from './student-manage.js';

export interface Guardian {
  id?: string;
  isPrimary?: boolean;
  notify?: boolean;
  name: string;
  relation: string;
  phone: string;
  telegramLinked: boolean;
}

const guardianText = (g: Guardian) =>
  [
    g.relation,
    g.phone && formatPhone(g.phone),
    g.isPrimary && t.staffProfile.primary,
    g.notify === false && t.staffProfile.muted,
    !g.telegramLinked && t.studentCard.noTelegram,
  ]
    .filter(Boolean)
    .join(' · ');

function GuardianRow({ g, onEdit }: { g: Guardian; onEdit?: () => void }) {
  const body = (
    <>
      <span className="text-base text-text">{g.name}</span>
      <span className="text-sm text-text-muted">{guardianText(g)}</span>
    </>
  );
  const cls = 'flex min-h-11 min-w-0 flex-1 flex-col justify-center text-left';
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-2 last:border-0">
      {onEdit ? (
        <button type="button" className={cls} onClick={onEdit}>
          {body}
        </button>
      ) : (
        <span className={cls}>{body}</span>
      )}
      {g.phone && (
        <a
          href={`tel:${g.phone}`}
          aria-label={`${t.studentCard.call}: ${g.name}`}
          className="flex size-11 items-center justify-center rounded-full bg-success-bg text-success"
        >
          <Phone className="size-5" aria-hidden />
        </a>
      )}
    </li>
  );
}

function Guardians(p: {
  guardians: readonly Guardian[];
  onEdit?: (guardianId: string) => void;
  onAdd?: () => void;
}) {
  return (
    <Section title={t.studentCard.parents}>
      {p.guardians.length === 0 && <EmptyRow text={t.staffProfile.noGuardians} />}
      {p.guardians.map((g) => {
        const { id } = g;
        const edit = id && p.onEdit ? () => p.onEdit?.(id) : undefined;
        return <GuardianRow key={g.phone || g.name} g={g} onEdit={edit} />;
      })}
      {p.onAdd && (
        <ListItem
          before={<UserPlus className="size-5 text-link" aria-hidden />}
          title={<span className="text-link">{t.staffProfile.addGuardian}</span>}
          onClick={p.onAdd}
        />
      )}
    </Section>
  );
}

function CardActions({ onSetup, onPay }: { onSetup?: () => void; onPay?: () => void }) {
  return (
    <>
      {onSetup && (
        <Section footer={t.staffSetup.openHint}>
          <ListItem
            before={<CalendarCog className="size-5 text-warning" aria-hidden />}
            title={t.staffSetup.open}
            chevron
            onClick={onSetup}
          />
        </Section>
      )}
      {onPay && (
        <Section>
          <ListItem
            before={<Wallet className="size-5" aria-hidden />}
            title={t.studentCard.pay}
            chevron
            onClick={onPay}
          />
        </Section>
      )}
    </>
  );
}

/** MS-05 O'quvchi kartochkasi: guruhlar, qarz, ota-ona telefoni (qo'ng'iroq — `tel:`). */
export function StudentCardView({
  s,
  guardians,
  onPay,
  manage,
  onSetup,
  details,
}: {
  s: StudentHit;
  guardians: readonly Guardian[];
  /** `payment.create` bo'lsa — MS-07 (T-131). */
  onPay?: () => void;
  /** `student.manage` bo'lsa — guruhdan chiqarish va arxiv (T-144). */
  manage?: StudentManageProps;
  /** T-145: hisob hali boshlanmagan — boshlang'ich holatni sozlash (MS-05b). */
  onSetup?: () => void;
  /** MS-23: ma'lumotlar va ichki ekranlar (T-152). */
  details?: ReactNode;
}) {
  const active = manage && !manage.m.archived ? manage : undefined;
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
      <CardActions onSetup={onSetup} onPay={onPay} />
      {manage?.m.archived && <ArchivedBanner />}
      {manage ? (
        <ManageGroups m={manage.m} onOpen={manage.onOpen} onEnroll={manage.onEnroll} />
      ) : (
        <Section title={t.studentCard.groups}>
          {s.groups.map((g) => (
            <ListItem key={g} title={g} />
          ))}
        </Section>
      )}
      <Guardians guardians={guardians} onEdit={active?.onGuardian} onAdd={active?.onAddGuardian} />
      {details}
      {manage && <PastGroups m={manage.m} onOpen={manage.onOpen} />}
      {manage && <ArchiveSection {...manage} />}
    </main>
  );
}

function ArchivedBanner() {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-warning-bg p-4">
      <span className="font-semibold text-warning">{t.studentCard.archived}</span>
      <span className="text-sm text-text-muted">{t.studentCard.archivedHint}</span>
    </div>
  );
}
