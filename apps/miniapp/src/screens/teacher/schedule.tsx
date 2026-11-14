import { formatTime, miniappMessages as t } from '@lg/i18n';
import { DayStrip, ListItem, Section, StatusChip, type StripDay } from '@lg/ui-tg';
import { CalendarX } from 'lucide-react';
import type { LessonInfo } from './lesson-header.js';

export interface ScheduleLesson extends LessonInfo {
  /** O'rinbosar bo'lsa — kimning o'rniga. */
  substituteFor?: string;
}

interface Props {
  week: readonly StripDay[];
  selected: string;
  lessons: readonly ScheduleLesson[];
  onSelect: (date: string) => void;
  onOpen: (lesson: ScheduleLesson) => void;
}

/** MT-09 Jadval: haftalik, o'rinbosar darslari belgili; dars → MT-02. */
export function ScheduleView({ week, selected, lessons, onSelect, onOpen }: Props) {
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{t.schedule.title}</h1>
      <DayStrip days={week} selected={selected} onSelect={onSelect} />
      {lessons.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-text-muted">
          <CalendarX className="size-8" aria-hidden />
          <p className="text-base">{t.schedule.empty}</p>
        </div>
      ) : (
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
                  {l.courseName} · {l.room}
                  {l.substituteFor && (
                    <StatusChip tone="warning">
                      {t.schedule.substituteFor.replace('{name}', l.substituteFor)}
                    </StatusChip>
                  )}
                </span>
              }
              chevron
              onClick={() => onOpen(l)}
            />
          ))}
        </Section>
      )}
    </main>
  );
}
