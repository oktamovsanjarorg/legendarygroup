import { miniappMessages as t } from '@lg/i18n';
import type { AttendanceMark } from './attendance-row.js';

export interface StripDay {
  /** `YYYY-MM-DD` (Toshkent). */
  date: string;
  day: number;
  /** Shu kuni dars bor (nuqta). */
  busy?: boolean;
}

interface StripProps {
  days: readonly StripDay[];
  selected: string;
  onSelect: (date: string) => void;
}

/** Hafta qatori (MT-09): Du…Ya, tanlangan kun, darsli kunlarda nuqta. */
export function DayStrip({ days, selected, onSelect }: StripProps) {
  return (
    <div className="grid grid-cols-7 gap-1 rounded-xl bg-bg p-2">
      {days.map((d, i) => {
        const on = d.date === selected;
        return (
          <button
            key={d.date}
            type="button"
            aria-pressed={on}
            onClick={() => onSelect(d.date)}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg ${on ? 'bg-primary text-primary-text' : 'text-text'}`}
          >
            <span className={`text-xs ${on ? '' : 'text-text-muted'}`}>
              {t.schedule.weekdays[i]}
            </span>
            <span className="text-base font-semibold tabular-nums">{d.day}</span>
            <span
              className={`size-1 rounded-full ${d.busy ? (on ? 'bg-primary-text' : 'bg-primary') : ''}`}
            />
          </button>
        );
      })}
    </div>
  );
}

const CELL: Record<AttendanceMark['kind'], string> = {
  present: 'bg-success-bg text-success',
  absent: 'bg-danger-bg text-danger',
  late: 'bg-warning-bg text-warning',
  excused: 'bg-surface-alt text-text-muted',
};
const LABEL: Record<AttendanceMark['kind'], string> = {
  present: t.attendance.present,
  absent: t.attendance.absent,
  late: t.attendance.late,
  excused: t.attendance.excused,
};
const SIGN: Record<AttendanceMark['kind'], string> = {
  present: '✓',
  absent: '✕',
  late: '◷',
  excused: '–',
};

interface MonthProps {
  /** Oyning 1-kuni hafta kuni: 0 = Dushanba. */
  offset: number;
  daysInMonth: number;
  /** Kun → holat (faqat dars bo'lgan kunlar). */
  marks: Readonly<Record<number, AttendanceMark['kind']>>;
}

/** Oylik davomat kalendari (MT-06, MG-02): rang + belgi (rang yagona belgi emas). */
export function AttendanceCalendar({ offset, daysInMonth, marks }: MonthProps) {
  const cells = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  return (
    <div className="grid grid-cols-7 gap-1 rounded-xl bg-bg p-3 text-center text-sm">
      {t.schedule.weekdays.map((w) => (
        <span key={w} className="pb-1 text-xs text-text-muted">
          {w}
        </span>
      ))}
      {cells.map((day, i) => {
        const kind = day === null ? undefined : marks[day];
        return (
          <span
            key={i}
            aria-label={day !== null && kind ? `${day}: ${LABEL[kind]}` : undefined}
            className={`flex aspect-square flex-col items-center justify-center rounded-lg tabular-nums ${kind ? CELL[kind] : 'text-text-muted'}`}
          >
            {day}
            {kind && (
              <span aria-hidden className="text-[10px] leading-none">
                {SIGN[kind]}
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}
