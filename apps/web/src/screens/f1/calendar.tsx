import { webMessages as t } from '@lg/i18n';
import { Badge, Button, cn, PageHeader, Tabs } from '@lg/ui-web';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { LessonCell } from './types.js';

interface Props {
  weekTitle: string;
  /** 0 = Dushanba, kun raqami bilan. */
  days: readonly { date: number; holiday?: string }[];
  lessons: readonly LessonCell[];
  todayIndex: number;
  onLesson: (l: LessonCell) => void;
}

function LessonBlock({ l, onClick }: { l: LessonCell; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-md border-l-4 bg-bg p-2 text-left text-xs shadow-sm hover:bg-surface',
        l.kind === 'cancelled'
          ? 'border-danger opacity-70'
          : l.kind === 'substitute'
            ? 'border-warning'
            : l.kind === 'extra'
              ? 'border-success'
              : 'border-primary',
      )}
    >
      <span
        className={cn(
          'font-semibold tabular-nums text-text',
          l.kind === 'cancelled' && 'line-through',
        )}
      >
        {l.start}–{l.end}
      </span>
      <span className={cn('text-text', l.kind === 'cancelled' && 'line-through')}>{l.group}</span>
      <span className="text-text-muted">
        {l.teacher} · {l.room}
      </span>
      {l.kind && (
        <Badge
          tone={l.kind === 'cancelled' ? 'danger' : l.kind === 'substitute' ? 'warning' : 'success'}
          className="mt-0.5 self-start no-underline"
        >
          {l.kind === 'cancelled'
            ? t.calendar.cancelled
            : l.kind === 'substitute'
              ? t.calendar.substitute
              : t.calendar.extra}
        </Badge>
      )}
    </button>
  );
}

/** W-11 Jadval (FR-ORG-5): haftalik ko'rinish; bekor/o'rinbosar/qo'shimcha dars, bayramlar. */
export function CalendarView({ weekTitle, days, lessons, todayIndex, onLesson }: Props) {
  return (
    <>
      <PageHeader
        title={t.calendar.title}
        description={weekTitle}
        actions={
          <>
            <Button variant="secondary" size="sm" aria-label={t.calendar.prev}>
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
            <Button variant="secondary" size="sm">
              {t.calendar.today}
            </Button>
            <Button variant="secondary" size="sm" aria-label={t.calendar.next}>
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </>
        }
      />
      <Tabs
        label={t.calendar.title}
        value="week"
        onChange={() => undefined}
        items={[
          { value: 'week', label: t.calendar.week },
          { value: 'month', label: t.calendar.month },
        ]}
      />
      <div className="grid grid-cols-7 gap-2">
        {days.map((d, i) => (
          <section
            key={d.date}
            className={cn(
              'flex min-h-[28rem] flex-col gap-2 rounded-lg p-2',
              i === todayIndex ? 'bg-primary/10' : 'bg-surface',
            )}
          >
            <h2 className="flex items-baseline justify-between px-1 text-sm">
              <span className="font-semibold text-text">{t.calendar.days[i]}</span>
              <span className="tabular-nums text-text-muted">{d.date}</span>
            </h2>
            {d.holiday && <Badge tone="info">{`${t.calendar.holiday}: ${d.holiday}`}</Badge>}
            {lessons
              .filter((l) => l.day === i)
              .sort((a, b) => a.start.localeCompare(b.start)) // filter — yangi massiv, props o'zgarmaydi
              .map((l) => (
                <LessonBlock key={l.id} l={l} onClick={() => onLesson(l)} />
              ))}
          </section>
        ))}
      </div>
    </>
  );
}
