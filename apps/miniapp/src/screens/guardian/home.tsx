import { formatDate, formatDateShort, formatTime, miniappMessages as t } from '@lg/i18n';
import {
  ChildSwitcher,
  type ChildTab,
  EmptyState,
  ListItem,
  MoneyText,
  Section,
  useMainButton,
} from '@lg/ui-tg';
import { CalendarClock, CheckCircle2, Clock4, FileText, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { LessonInfo } from '../teacher/lesson-header.js';

export type ChildToday =
  | { kind: 'present' }
  | { kind: 'absent' }
  | { kind: 'late'; minutes: number }
  | { kind: 'excused' }
  | { kind: 'pending'; at: Date }
  | { kind: 'none' };

export interface ChildSummary {
  id: string;
  name: string;
  today: ChildToday;
  next?: LessonInfo;
  /** BR-20: > 0 — qarz, < 0 — avans (oldindan to'langan). */
  debt: bigint;
  dueDate?: Date;
}

const TODAY: Record<ChildToday['kind'], { icon: ReactNode; tone: string }> = {
  present: {
    icon: <CheckCircle2 className="size-7" aria-hidden />,
    tone: 'bg-success-bg text-success',
  },
  absent: { icon: <XCircle className="size-7" aria-hidden />, tone: 'bg-danger-bg text-danger' },
  late: { icon: <Clock4 className="size-7" aria-hidden />, tone: 'bg-warning-bg text-warning' },
  excused: {
    icon: <FileText className="size-7" aria-hidden />,
    tone: 'bg-surface-alt text-text-muted',
  },
  pending: { icon: <CalendarClock className="size-7" aria-hidden />, tone: 'bg-bg text-text' },
  none: { icon: <CalendarClock className="size-7" aria-hidden />, tone: 'bg-bg text-text-muted' },
};

function todayText(s: ChildToday): string {
  switch (s.kind) {
    case 'present':
      return t.childHome.todayCame;
    case 'absent':
      return t.childHome.todayAbsent;
    case 'late':
      return t.childHome.todayLate.replace('{n}', String(s.minutes));
    case 'excused':
      return t.childHome.todayExcused;
    case 'pending':
      return t.childHome.todayPending.replace('{time}', formatTime(s.at));
    case 'none':
      return t.childHome.todayNoLesson;
  }
}

function BalanceCard({ debt, dueDate }: Pick<ChildSummary, 'debt' | 'dueDate'>) {
  const label =
    debt > 0n ? t.childHome.debt : debt < 0n ? t.childHome.advance : t.childHome.balance;
  return (
    <div className={`flex flex-col gap-1 rounded-xl p-4 ${debt > 0n ? 'bg-danger-bg' : 'bg-bg'}`}>
      <span className="text-sm text-text-muted">{label}</span>
      {debt === 0n ? (
        <span className="text-xl font-semibold text-success">{t.childHome.settled}</span>
      ) : (
        // Qarz manfiy (qizil), avans musbat ko'rinadi.
        <MoneyText amount={-debt} className="text-2xl font-bold" />
      )}
      {debt > 0n && dueDate && (
        <span className="text-sm text-danger">
          {t.childHome.dueBy.replace('{date}', formatDateShort(dueDate))}
        </span>
      )}
    </div>
  );
}

interface Props {
  items: readonly ChildSummary[];
  selected: string;
  onSelect: (id: string) => void;
  onPay: () => void;
}

/** MG-01 Asosiy: farzand holati bir qarashda; qarz bo'lsa — MainButton "To'lash" → MG-06. */
export function GuardianHomeView({ items, selected, onSelect, onPay }: Props) {
  const child = items.find((c) => c.id === selected) ?? items[0];
  useMainButton({ text: t.childHome.pay, onClick: onPay, visible: (child?.debt ?? 0n) > 0n });
  if (!child)
    return <EmptyState title={t.childHome.noChildren} hint={t.childHome.noChildrenHint} />;
  const tabs: ChildTab[] = items.map((c) => ({ id: c.id, name: c.name.split(' ')[1] ?? c.name }));
  const today = TODAY[child.today.kind];
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <ChildSwitcher items={tabs} selected={child.id} onSelect={onSelect} label={t.gtabs.home} />
      <h1 className="px-2 text-2xl font-bold text-text">{child.name}</h1>
      <div className={`flex items-center gap-3 rounded-xl p-4 ${today.tone}`}>
        {today.icon}
        <span className="text-lg font-semibold">{todayText(child.today)}</span>
      </div>
      {child.next && (
        <Section title={t.childHome.nextLesson}>
          <ListItem
            title={child.next.groupName}
            subtitle={`${formatDate(child.next.startsAt, { withYear: false })}, ${formatTime(child.next.startsAt)} · ${child.next.room}`}
          />
        </Section>
      )}
      <BalanceCard debt={child.debt} dueDate={child.dueDate} />
    </main>
  );
}
