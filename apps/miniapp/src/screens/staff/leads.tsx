import { LEAD_STATUS_FLOW, LEAD_STATUSES, type LeadDto, type LeadStatus } from '@lg/contracts';
import { formatDate, formatPhone, formatYmd, miniappMessages as t } from '@lg/i18n';
import {
  EmptyState,
  ListItem,
  SearchField,
  Section,
  Segmented,
  useMainButton,
  useSecondaryButton,
} from '@lg/ui-tg';
import { InfoSection, Screen } from './form-kit.js';
import { CallLink } from './kit.js';

const c = t.leads;

export interface LeadsViewProps {
  items: readonly LeadDto[];
  status: LeadStatus;
  query: string;
  summary: string | null;
  onStatus: (s: LeadStatus) => void;
  onQuery: (q: string) => void;
  onOpen: (l: LeadDto) => void;
  onAdd: () => void;
}

const subtitle = (l: LeadDto) =>
  [
    formatPhone(l.phone),
    l.course?.name,
    l.trial
      ? `${formatYmd(l.trial.date)} ${l.trial.startTime}`
      : formatDate(new Date(l.statusChangedAt)),
  ]
    .filter(Boolean)
    .join(' · ');

/** MS-09 Lidlar (T-133, FR-STU-4): bosqich → ro'yxat; MainButton — yangi lid. */
export function LeadsView(p: LeadsViewProps) {
  useMainButton({ text: c.add, onClick: p.onAdd });
  return (
    <Screen title={c.title} subtitle={p.summary}>
      <Segmented<LeadStatus>
        label={c.filterLabel}
        value={p.status}
        options={LEAD_STATUSES.map((value) => ({ value, label: c.tabs[value] }))}
        onChange={p.onStatus}
      />
      <SearchField
        clearLabel={c.clear}
        value={p.query}
        onChange={p.onQuery}
        placeholder={c.search}
      />
      {p.items.length === 0 ? (
        <EmptyState title={c.empty} hint={c.emptyHint} />
      ) : (
        <Section>
          {p.items.map((l) => (
            <ListItem
              key={l.id}
              title={l.fullName}
              subtitle={subtitle(l)}
              chevron
              onClick={() => p.onOpen(l)}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

export interface LeadViewProps {
  lead: LeadDto;
  busy: boolean;
  onStatus: (s: 'new' | 'contacted' | 'trial') => void;
  onLost: () => void;
  onTrial: () => void;
  onConvert: () => void;
  onEdit: () => void;
  onStudent: (id: string) => void;
}

function Steps({ p, open }: { p: LeadViewProps; open: boolean }) {
  const next: readonly LeadStatus[] = LEAD_STATUS_FLOW[p.lead.status];
  if (next.length === 0) return null;
  return (
    <Section title={c.actions}>
      {next.map((s) =>
        s === 'won' ? null : (
          <ListItem
            key={s}
            title={<span className={s === 'lost' ? 'text-danger' : 'text-link'}>{c.to[s]}</span>}
            disabled={p.busy}
            onClick={() => (s === 'lost' ? p.onLost() : p.onStatus(s))}
          />
        ),
      )}
      {open && (
        <ListItem title={<span className="text-link">{c.trial}</span>} onClick={p.onTrial} />
      )}
    </Section>
  );
}

/** Lid kartochkasi: qo'ng'iroq, keyingi qadam; MainButton — o'quvchiga aylantirish. */
export function LeadView(p: LeadViewProps) {
  const { lead: l } = p;
  const open = l.status !== 'won' && l.status !== 'lost';
  const { studentId } = l;
  useMainButton({
    text: open ? c.convert : c.student,
    visible: open || studentId !== null,
    onClick: () => (open ? p.onConvert() : studentId && p.onStudent(studentId)),
  });
  useSecondaryButton({ text: c.edit, visible: open, onClick: p.onEdit });
  return (
    <Screen title={l.fullName} subtitle={c.stages[l.status]}>
      <CallLink phone={l.phone} />
      <InfoSection
        items={[
          { label: c.course, value: l.course?.name },
          { label: c.source, value: l.source && c.sources[l.source] },
          {
            label: c.trialAt,
            value:
              l.trial && `${formatYmd(l.trial.date)} ${l.trial.startTime} · ${l.trial.group.name}`,
          },
          { label: c.lostReason, value: l.lostReason },
          { label: c.notes, value: l.notes },
          { label: c.assigned, value: l.assignedTo?.name },
          { label: c.created, value: formatDate(new Date(l.createdAt)) },
        ]}
      />
      <Steps p={p} open={open} />
    </Screen>
  );
}
