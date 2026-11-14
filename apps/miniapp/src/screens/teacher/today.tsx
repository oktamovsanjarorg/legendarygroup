import { formatTime, miniappMessages as t } from '@lg/i18n';
import { EmptyState, InlineButton, ListItem, Section, StatusChip } from '@lg/ui-tg';
import { AlertTriangle } from 'lucide-react';
import type { LessonInfo } from './lesson-header.js';

export type LessonState =
  | { kind: 'upcoming' }
  | { kind: 'now' }
  | { kind: 'unmarked' }
  | { kind: 'marked'; present: number; total: number };

export interface TodayLesson extends LessonInfo {
  state: LessonState;
}

function StateChip({ state }: { state: LessonState }) {
  switch (state.kind) {
    case 'upcoming':
      return <StatusChip tone="muted">{t.today.lessonUpcoming}</StatusChip>;
    case 'now':
      return <StatusChip tone="info">{t.today.lessonNow}</StatusChip>;
    case 'unmarked':
      return <StatusChip tone="danger">{t.today.lessonUnmarked}</StatusChip>;
    case 'marked':
      return (
        <StatusChip tone="success">
          {t.today.lessonMarked
            .replace('{present}', String(state.present))
            .replace('{total}', String(state.total))}
        </StatusChip>
      );
  }
}

interface Props {
  lessons: readonly TodayLesson[];
  onOpen: (lesson: TodayLesson) => void;
  onSchedule: () => void;
}

/** MT-01 Bugun (FR-ATT-1/5): bugungi darslar; belgilanmaganlar tepada ogohlantirish bilan. */
export function TodayView({ lessons, onOpen, onSchedule }: Props) {
  if (lessons.length === 0)
    return (
      <EmptyState
        title={t.today.empty}
        hint={t.today.emptyHint}
        action={<InlineButton onClick={onSchedule}>{t.today.emptyAction}</InlineButton>}
      />
    );
  const unmarked = lessons.filter((l) => l.state.kind === 'unmarked').length;
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{t.today.title}</h1>
      {unmarked > 0 && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-xl bg-danger-bg p-3 text-sm font-medium text-danger"
        >
          <AlertTriangle className="size-5 shrink-0" aria-hidden />
          {t.today.unmarkedWarning.replace('{n}', String(unmarked))}
        </div>
      )}
      <Section>
        {lessons.map((l) => (
          <ListItem
            key={l.id}
            before={
              <span className="flex w-12 flex-col text-sm tabular-nums">
                <span className="font-semibold text-text">{formatTime(l.startsAt)}</span>
                <span>{formatTime(l.endsAt)}</span>
              </span>
            }
            title={l.groupName}
            subtitle={
              <span className="flex flex-col items-start gap-1">
                <span>
                  {l.courseName} · {l.room}
                  {l.substitute ? ` · ${t.today.substitute}` : ''}
                </span>
                <StateChip state={l.state} />
              </span>
            }
            chevron
            onClick={() => onOpen(l)}
          />
        ))}
      </Section>
    </main>
  );
}
