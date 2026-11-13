import { webMessages as t } from '@lg/i18n';
import { Badge, Button, cn, ErrorState, LoadingState, PageHeader, Tabs } from '@lg/ui-web';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { LessonBlock, LessonChip } from './calendar-cells.js';
import type { CalendarDay, LessonCell } from './types.js';

export type CalendarMode = 'week' | 'month';
const MONTH_VISIBLE = 4;

interface GridProps {
  days: readonly CalendarDay[];
  lessons: readonly LessonCell[];
  today: string;
  onLesson: (l: LessonCell) => void;
  /** Oy ko'rinishida joriy oy (`YYYY-MM`) — qo'shni oy kunlari xira. */
  month?: string;
  /** Oy ko'rinishida kunni bosish — o'sha haftaga o'tish. */
  onDay: (ymd: string) => void;
}

interface Props extends GridProps {
  /** `9–15-noyabr, 2026` yoki `noyabr, 2026`. */
  title: string;
  mode: CalendarMode;
  loading?: boolean;
  error?: { message: string; requestId?: string; onRetry: () => void };
  /** Filtrlar (guruh, ustoz) va amallar (qo'shimcha dars, bayramlar). */
  toolbar?: ReactNode;
  onMode: (m: CalendarMode) => void;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
}

const dayNumber = (ymd: string) => Number(ymd.slice(8));
/** Kun darslari vaqt bo'yicha (filter — yangi massiv, props o'zgarmaydi). */
const lessonsOn = (lessons: readonly LessonCell[], ymd: string) =>
  lessons.filter((l) => l.date === ymd).sort((a, b) => a.start.localeCompare(b.start));

function WeekGrid({ days, lessons, today, onLesson }: GridProps) {
  return (
    <div className="grid grid-cols-7 gap-2">
      {days.map((d, i) => (
        <section
          key={d.ymd}
          className={cn(
            'flex min-h-[28rem] flex-col gap-2 rounded-lg p-2',
            d.ymd === today ? 'bg-primary/10' : 'bg-surface',
          )}
        >
          <h2 className="flex items-baseline justify-between px-1 text-sm">
            <span className="font-semibold text-text">{t.calendar.days[i]}</span>
            <span className="tabular-nums text-text-muted">{dayNumber(d.ymd)}</span>
          </h2>
          {d.holiday && <Badge tone="info">{`${t.calendar.holiday}: ${d.holiday}`}</Badge>}
          {lessonsOn(lessons, d.ymd).map((l) => (
            <LessonBlock key={l.id} l={l} onClick={() => onLesson(l)} />
          ))}
        </section>
      ))}
    </div>
  );
}

function MonthCell({
  d,
  lessons,
  today,
  month,
  onLesson,
  onDay,
}: Omit<GridProps, 'days'> & { d: CalendarDay }) {
  const items = lessonsOn(lessons, d.ymd);
  const rest = items.length - MONTH_VISIBLE;
  return (
    <section
      className={cn(
        'flex min-h-28 flex-col gap-1 rounded-md border border-border p-1.5',
        d.ymd === today ? 'bg-primary/10' : 'bg-bg',
        month && !d.ymd.startsWith(month) && 'opacity-50',
      )}
    >
      <button
        type="button"
        onClick={() => onDay(d.ymd)}
        className="self-end rounded px-1 text-xs font-medium tabular-nums text-text-muted hover:bg-surface-alt"
      >
        {dayNumber(d.ymd)}
      </button>
      {d.holiday && <Badge tone="info">{d.holiday}</Badge>}
      {items.slice(0, MONTH_VISIBLE).map((l) => (
        <LessonChip key={l.id} l={l} onClick={() => onLesson(l)} />
      ))}
      {rest > 0 && (
        <button
          type="button"
          onClick={() => onDay(d.ymd)}
          className="text-left text-xs text-link hover:underline"
        >
          {t.calendar.more.replace('{n}', String(rest))}
        </button>
      )}
    </section>
  );
}

function MonthGrid({ days, ...rest }: GridProps) {
  return (
    <div className="grid grid-cols-7 gap-1.5">
      {t.calendar.daysShort.map((name) => (
        <h2 key={name} className="px-1 text-xs font-semibold uppercase text-text-muted">
          {name}
        </h2>
      ))}
      {days.map((d) => (
        <MonthCell key={d.ymd} d={d} {...rest} />
      ))}
    </div>
  );
}

function Nav({
  mode,
  onPrev,
  onToday,
  onNext,
}: Pick<Props, 'mode' | 'onPrev' | 'onToday' | 'onNext'>) {
  const week = mode === 'week';
  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        aria-label={week ? t.calendar.prev : t.calendar.prevMonth}
        onClick={onPrev}
      >
        <ChevronLeft className="size-4" aria-hidden />
      </Button>
      <Button variant="secondary" size="sm" onClick={onToday}>
        {t.calendar.today}
      </Button>
      <Button
        variant="secondary"
        size="sm"
        aria-label={week ? t.calendar.next : t.calendar.nextMonth}
        onClick={onNext}
      >
        <ChevronRight className="size-4" aria-hidden />
      </Button>
    </>
  );
}

/** W-11 Jadval (FR-ORG-5): hafta/oy; bekor/o'rinbosar/qo'shimcha/qoplovchi dars, bayramlar. */
export function CalendarView(p: Props) {
  const grid = {
    days: p.days,
    lessons: p.lessons,
    today: p.today,
    month: p.month,
    onLesson: p.onLesson,
    onDay: p.onDay,
  };
  return (
    <>
      <PageHeader title={t.calendar.title} description={p.title} actions={<Nav {...p} />} />
      <Tabs
        label={t.calendar.title}
        value={p.mode}
        onChange={p.onMode}
        items={[
          { value: 'week', label: t.calendar.week },
          { value: 'month', label: t.calendar.month },
        ]}
      />
      {p.toolbar && <div className="mb-3 flex flex-wrap items-end gap-3">{p.toolbar}</div>}
      {p.error ? (
        <ErrorState {...p.error} />
      ) : p.loading ? (
        <LoadingState rows={6} />
      ) : p.mode === 'week' ? (
        <WeekGrid {...grid} />
      ) : (
        <MonthGrid {...grid} />
      )}
    </>
  );
}
