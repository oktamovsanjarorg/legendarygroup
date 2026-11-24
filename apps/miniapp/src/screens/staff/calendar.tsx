import type { LessonDto } from '@lg/contracts';
import { formatYmd, miniappMessages as t } from '@lg/i18n';
import {
  DayStrip,
  EmptyState,
  ListItem,
  Section,
  StatusChip,
  type StripDay,
  useMainButton,
  useSecondaryButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import type { lessonActions } from '../../data/staff-calendar.js';
import { InfoSection, Screen } from './form-kit.js';
import { ConfirmSheet, StepBar } from './kit.js';

const c = t.staffCalendar;

export interface CalendarViewProps {
  title: string;
  week: readonly StripDay[];
  selected: string;
  lessons: readonly LessonDto[];
  onSelect: (date: string) => void;
  onWeek: (step: -1 | 1) => void;
  onOpen: (id: string) => void;
  onExtra: () => void;
}

export const lessonTags = (l: LessonDto) =>
  [l.teacher?.name, l.room?.name, c.kinds[l.kind], l.isSubstitute ? c.substitute : '']
    .filter(Boolean)
    .join(' · ');

const TONE = { scheduled: 'muted', done: 'success', cancelled: 'danger' } as const;

/** MS-22 Darslar kalendari (T-151): hafta → kun; MainButton — qo'shimcha dars. */
export function CalendarView(p: CalendarViewProps) {
  useMainButton({ text: c.extra, onClick: p.onExtra });
  return (
    <Screen title={c.title}>
      <StepBar label={p.title} prevLabel={c.prevWeek} nextLabel={c.nextWeek} onStep={p.onWeek} />
      <DayStrip days={p.week} selected={p.selected} onSelect={p.onSelect} />
      {p.lessons.length === 0 ? (
        <EmptyState title={c.empty} />
      ) : (
        <Section>
          {p.lessons.map((l) => (
            <ListItem
              key={l.id}
              before={
                <span className="flex w-12 flex-col text-sm tabular-nums">
                  <span className="font-semibold text-text">{l.startTime}</span>
                  <span>{l.endTime}</span>
                </span>
              }
              title={l.group.name}
              subtitle={lessonTags(l)}
              after={
                l.status === 'scheduled' ? undefined : (
                  <StatusChip tone={TONE[l.status]}>{c.statuses[l.status]}</StatusChip>
                )
              }
              chevron
              onClick={() => p.onOpen(l.id)}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

export interface LessonViewProps {
  lesson: LessonDto;
  can: ReturnType<typeof lessonActions>;
  busy: boolean;
  onAttendance: () => void;
  onGroup: () => void;
  onCancel: () => void;
  onMove: () => void;
  onMakeup: () => void;
  onReplace: () => void;
  onRestore: () => void;
}

const LessonInfo = ({ lesson: l }: { lesson: LessonDto }) => (
  <InfoSection
    items={[
      { label: c.date, value: formatYmd(l.date) },
      { label: c.time, value: `${l.startTime}–${l.endTime}` },
      {
        label: l.isSubstitute ? c.substitute : c.teacher,
        value: l.teacher?.name ?? t.staffGroups.noTeacher,
      },
      { label: c.room, value: l.room?.name ?? c.noRoom },
      { label: c.topic, value: l.topic },
      { label: c.reason, value: l.cancelReason },
      l.status === 'cancelled'
        ? { label: c.compensation, value: c.compensations[l.compensation ?? 'none'] }
        : null,
    ]}
  />
);

/** Dars kartochkasi: MainButton — davomat; amallar ro'yxatda. */
export function LessonView(p: LessonViewProps) {
  const { lesson: l, can } = p;
  const [asking, setAsking] = useState(false);
  useMainButton({ text: c.attendance, visible: can.attendance, onClick: p.onAttendance });
  useSecondaryButton({ text: c.group, onClick: p.onGroup });
  const link = (show: boolean, text: string, onClick: () => void, danger = false) =>
    show && (
      <ListItem
        title={<span className={danger ? 'text-danger' : 'text-link'}>{text}</span>}
        disabled={p.busy}
        onClick={onClick}
      />
    );
  const any = can.cancel || can.move || can.makeup || can.replace || can.restore;
  return (
    <Screen
      title={l.group.name}
      subtitle={[c.statuses[l.status], c.kinds[l.kind]].filter(Boolean).join(' · ')}
    >
      <LessonInfo lesson={l} />
      {any && (
        <Section title={c.actions}>
          {link(can.replace, c.substituteSet, p.onReplace)}
          {link(can.move, c.move, p.onMove)}
          {link(can.makeup, c.makeup, p.onMakeup)}
          {link(can.restore, c.restore, () => setAsking(true))}
          {link(can.cancel, c.cancel, p.onCancel, true)}
        </Section>
      )}
      <ConfirmSheet
        open={asking}
        title={c.restore}
        action={c.restore}
        onClose={() => setAsking(false)}
        onConfirm={p.onRestore}
      >
        {c.restoreAsk}
      </ConfirmSheet>
    </Screen>
  );
}
