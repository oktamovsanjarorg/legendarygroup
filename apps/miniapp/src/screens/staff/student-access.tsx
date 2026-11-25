import { formatPeriod, formatYmd, miniappMessages as t } from '@lg/i18n';
import { CopyField, ListItem, Section, StatusChip } from '@lg/ui-tg';
import { KeyRound, Unlink } from 'lucide-react';
import { useState } from 'react';
import type { AttendanceHistoryItem } from '../../data/staff-profile.js';
import { EmptyRow, Screen } from './form-kit.js';
import { ConfirmSheet, PeriodBar } from './kit.js';

const c = t.staffAccess;

const ASK = {
  code: { title: c.generateTitle, action: c.regenerate, text: c.generateText },
  unlink: { title: c.unlinkTitle, action: c.unlink, text: c.unlinkText },
};

const State = (p: { label: string; on: boolean; yes: string; no: string }) => (
  <ListItem
    title={p.label}
    after={<StatusChip tone={p.on ? 'success' : 'muted'}>{p.on ? p.yes : p.no}</StatusChip>}
  />
);

/** O'quvchining Mini App'ga kirishi (T-126): kod va Telegram bog'lanishi. */
export function StudentAccessView(p: {
  student: string;
  telegramLinked: boolean;
  codeSet: boolean;
  /** Hozirgina yaratilgan kod — bir marta ko'rsatiladi. */
  newCode: string | null;
  busy: boolean;
  onGenerate: () => void;
  onUnlink: () => void;
}) {
  const [ask, setAsk] = useState<'code' | 'unlink' | null>(null);
  const run = (f: () => void) => (p.busy ? undefined : f);
  return (
    <Screen title={c.title} subtitle={p.student}>
      <Section>
        <State label={c.telegram} on={p.telegramLinked} yes={c.linked} no={c.notLinked} />
        <State label={c.code} on={p.codeSet} yes={c.codeSet} no={c.codeNotSet} />
      </Section>
      {p.newCode && (
        <CopyField
          value={p.newCode}
          caption={c.newCode}
          copyLabel={c.copy}
          copiedLabel={c.copied}
        />
      )}
      <Section>
        <ListItem
          before={<KeyRound className="size-5" aria-hidden />}
          title={p.codeSet ? c.regenerate : c.generate}
          onClick={run(() => (p.codeSet ? setAsk('code') : p.onGenerate()))}
        />
        {p.telegramLinked && (
          <ListItem
            before={<Unlink className="size-5 text-danger" aria-hidden />}
            title={<span className="text-danger">{c.unlink}</span>}
            onClick={run(() => setAsk('unlink'))}
          />
        )}
      </Section>
      {ask && (
        <ConfirmSheet
          open
          danger={ask === 'unlink'}
          {...ASK[ask]}
          onClose={() => setAsk(null)}
          onConfirm={ask === 'code' ? p.onGenerate : p.onUnlink}
        >
          <p className="px-4 pb-2 text-sm text-text-muted">{ASK[ask].text}</p>
        </ConfirmSheet>
      )}
    </Screen>
  );
}

const a = t.staffStudentAttendance;
const TONES = { present: 'success', late: 'warning', absent: 'danger', excused: 'muted' } as const;

const statusText = (i: AttendanceHistoryItem) =>
  i.status === 'late' && i.lateMinutes
    ? a.lateBy.replace('{n}', String(i.lateMinutes))
    : a[i.status];

/** O'quvchi davomati — oyma-oy. */
export function StudentAttendanceView(p: {
  period: string;
  current: string;
  items: readonly AttendanceHistoryItem[];
  onStep: (step: -1 | 1) => void;
}) {
  return (
    <Screen title={a.title}>
      <PeriodBar period={p.period} current={p.current} onStep={p.onStep} />
      <Section title={formatPeriod(p.period)}>
        {p.items.length === 0 && <EmptyRow text={a.empty} />}
        {p.items.map((i) => (
          <ListItem
            key={i.id}
            title={`${formatYmd(i.date)}, ${i.startTime.slice(0, 5)}`}
            subtitle={[i.groupName, i.note].filter(Boolean).join(' · ')}
            after={<StatusChip tone={TONES[i.status]}>{statusText(i)}</StatusChip>}
          />
        ))}
      </Section>
    </Screen>
  );
}
