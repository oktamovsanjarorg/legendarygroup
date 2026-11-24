import { GUARDIAN_RELATIONS, type GuardianLinkRequest, type StudentListRow } from '@lg/contracts';
import { formatDateTime, formatPhone, miniappMessages as t } from '@lg/i18n';
import {
  ActionSheet,
  EmptyState,
  ListItem,
  SearchField,
  Section,
  Segmented,
  TextArea,
  useMainButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import type { Relation } from '../../data/staff-links.js';
import { CallLink } from './kit.js';

const l = t.linkReq;

const nameOf = (r: GuardianLinkRequest) =>
  r.telegramUsername ? `${r.fullName} (@${r.telegramUsername})` : r.fullName;

/** MS-11 ro'yxat (T-135): so'rov → bog'lash / rad etish. */
export function LinkRequestsView({
  items,
  onLink,
  onReject,
}: {
  items: readonly GuardianLinkRequest[];
  onLink: (r: GuardianLinkRequest) => void;
  onReject: (r: GuardianLinkRequest) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = items.find((r) => r.id === openId);
  const act = (run: (r: GuardianLinkRequest) => void) => () => {
    setOpenId(null);
    if (open) run(open);
  };
  return (
    <main className="flex flex-col gap-3 p-2 pt-3 pb-6">
      <h1 className="px-2 text-2xl font-bold text-text">{l.title}</h1>
      {items.length === 0 ? (
        <EmptyState title={l.empty} hint={l.emptyHint} />
      ) : (
        <>
          <p className="px-2 text-sm text-text-muted">{l.hint}</p>
          <Section>
            {items.map((r) => (
              <ListItem
                key={r.id}
                title={nameOf(r)}
                subtitle={`${formatPhone(r.phone)} · ${formatDateTime(new Date(r.createdAt))}`}
                chevron
                onClick={() => setOpenId(r.id)}
              />
            ))}
          </Section>
        </>
      )}
      <ActionSheet
        open={open !== undefined}
        title={open && nameOf(open)}
        cancelLabel={l.cancel}
        onClose={() => setOpenId(null)}
        actions={[
          { label: l.link, onSelect: act(onLink) },
          { label: l.reject, tone: 'danger', onSelect: act(onReject) },
        ]}
      >
        {open && <CallLink phone={open.phone} />}
      </ActionSheet>
    </main>
  );
}

interface LinkProps {
  req: GuardianLinkRequest;
  query: string;
  found: readonly StudentListRow[];
  saving: boolean;
  onQuery: (q: string) => void;
  onSave: (studentId: string, relation: Relation) => void;
}

function StudentSearch({
  query,
  found,
  onQuery,
  onPick,
}: Pick<LinkProps, 'query' | 'found' | 'onQuery'> & { onPick: (s: StudentListRow) => void }) {
  return (
    <>
      <SearchField
        value={query}
        placeholder={t.search.placeholder}
        clearLabel={l.cancel}
        onChange={onQuery}
      />
      {found.length > 0 ? (
        <Section>
          {found.map((s) => (
            <ListItem
              key={s.id}
              title={s.fullName}
              subtitle={`LG-${s.code}`}
              chevron
              onClick={() => onPick(s)}
            />
          ))}
        </Section>
      ) : (
        <p className="px-2 text-sm text-text-muted">
          {query.trim().length < 2 ? t.search.hint : t.search.notFound}
        </p>
      )}
    </>
  );
}

/** So'rovni farzandga bog'lash: qidirib tanlash → qarindoshlik → MainButton. */
export function LinkStudentView({ req, query, found, saving, onQuery, onSave }: LinkProps) {
  const [student, setStudent] = useState<StudentListRow | null>(null);
  const [relation, setRelation] = useState<Relation>('mother');
  useMainButton({
    text: l.save,
    visible: student !== null,
    loading: saving,
    onClick: () => student && onSave(student.id, relation),
  });
  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <header className="px-2">
        <h1 className="text-xl font-semibold text-text">{l.pickTitle}</h1>
        <p className="text-sm text-text-muted">
          {nameOf(req)} · {formatPhone(req.phone)}
        </p>
      </header>
      {student ? (
        <>
          <Section title={l.student}>
            <ListItem title={student.fullName} subtitle={`LG-${student.code}`} />
            <ListItem
              title={<span className="text-link">{l.change}</span>}
              onClick={() => setStudent(null)}
            />
          </Section>
          <Segmented<Relation>
            label={l.relation}
            value={relation}
            options={GUARDIAN_RELATIONS.map((r) => ({
              value: r,
              label: t.studentCard.relations[r],
            }))}
            onChange={setRelation}
          />
        </>
      ) : (
        <StudentSearch query={query} found={found} onQuery={onQuery} onPick={setStudent} />
      )}
    </main>
  );
}

/** Rad etish: sabab majburiy (so'rov egasi botda ko'radi). */
export function RejectLinkView({
  req,
  saving,
  onSave,
}: {
  req: GuardianLinkRequest;
  saving: boolean;
  onSave: (reason: string) => void;
}) {
  const [reason, setReason] = useState('');
  useMainButton({
    text: l.reject,
    disabled: reason.trim().length < 2,
    loading: saving,
    onClick: () => onSave(reason.trim()),
  });
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <h1 className="px-2 text-xl font-semibold text-text">{nameOf(req)}</h1>
      <TextArea
        label={l.rejectTitle}
        value={reason}
        maxLength={500}
        onChange={(e) => setReason(e.target.value)}
      />
      <p className="px-4 text-sm text-text-muted">{l.rejectHint}</p>
    </main>
  );
}
