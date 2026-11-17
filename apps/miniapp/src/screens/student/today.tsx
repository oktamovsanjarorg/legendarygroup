import type { LessonDto } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section } from '@lg/ui-tg';
import { CalendarClock, CalendarX, CheckCircle2, Clock4, FileText, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ChildToday } from '../guardian/home.js';

interface Props {
  studentName: string;
  todayStatus: ChildToday;
  todayLessons: readonly LessonDto[];
  nextLesson?: LessonDto;
}

const TODAY_ICONS: Record<ChildToday['kind'], { icon: ReactNode; tone: string }> = {
  present: {
    icon: <CheckCircle2 className="size-7" aria-hidden />,
    tone: 'bg-success-bg text-success',
  },
  absent: {
    icon: <XCircle className="size-7" aria-hidden />,
    tone: 'bg-danger-bg text-danger',
  },
  late: {
    icon: <Clock4 className="size-7" aria-hidden />,
    tone: 'bg-warning-bg text-warning',
  },
  excused: {
    icon: <FileText className="size-7" aria-hidden />,
    tone: 'bg-surface-alt text-text-muted',
  },
  pending: {
    icon: <CalendarClock className="size-7" aria-hidden />,
    tone: 'bg-bg text-text',
  },
  none: {
    icon: <CalendarClock className="size-7" aria-hidden />,
    tone: 'bg-bg text-text-muted',
  },
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
      return t.childHome.todayPending.replace('{time}', s.at.toISOString().slice(11, 16));
    case 'none':
      return t.childHome.todayNoLesson;
  }
}

/**
 * M-STU-01 Oʻquvchi bosh ekrani: bugungi holat va darslar (T-126, D4).
 */
export function StudentTodayView({ studentName, todayStatus, todayLessons, nextLesson }: Props) {
  const currentStatus = TODAY_ICONS[todayStatus.kind];

  return (
    <main className="flex flex-col gap-4 p-2 pt-3 pb-6">
      <h1 className="px-2 text-2xl font-bold text-text">
        {t.studentPanel.todayTitle}, {studentName}
      </h1>

      <div className={`flex items-center gap-3 rounded-xl p-4 ${currentStatus.tone}`}>
        {currentStatus.icon}
        <span className="text-lg font-semibold">{todayText(todayStatus)}</span>
      </div>

      {todayLessons.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-text-muted">
          <CalendarX className="size-8" aria-hidden />
          <p className="text-base font-medium">{t.studentPanel.noLessonsToday}</p>
          <p className="text-sm">{t.studentPanel.noLessonsTodayHint}</p>
        </div>
      ) : (
        <Section title={t.studentPanel.todayLessons}>
          {todayLessons.map((l) => (
            <ListItem
              key={l.id}
              before={
                <span className="flex w-14 flex-col text-sm tabular-nums">
                  <span className="font-semibold text-text">{l.startTime}</span>
                  <span className="text-text-muted">{l.endTime}</span>
                </span>
              }
              title={l.group.name}
              subtitle={`${l.room ? `${t.studentPanel.room}: ${l.room.name}` : ''}${l.teacher ? ` · ${l.teacher.name}` : ''}`}
            />
          ))}
        </Section>
      )}

      {nextLesson && todayLessons.length === 0 && (
        <Section title={t.childHome.nextLesson}>
          <ListItem
            title={nextLesson.group.name}
            subtitle={`${nextLesson.date}, ${nextLesson.startTime} · ${nextLesson.room?.name ?? ''}`}
          />
        </Section>
      )}
    </main>
  );
}
