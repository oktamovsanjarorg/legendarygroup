import { webMessages as t } from '@lg/i18n';
import { Badge, type BadgeTone, cn } from '@lg/ui-web';
import type { LessonCell, LessonCellKind } from './types.js';

const BORDER: Record<LessonCellKind | 'regular', string> = {
  regular: 'border-primary',
  cancelled: 'border-danger opacity-70',
  substitute: 'border-warning',
  extra: 'border-success',
  makeup: 'border-success',
};
const TONE: Record<LessonCellKind, BadgeTone> = {
  cancelled: 'danger',
  substitute: 'warning',
  extra: 'success',
  makeup: 'success',
};
const LABEL: Record<LessonCellKind, string> = {
  cancelled: t.calendar.cancelled,
  substitute: t.calendar.substitute,
  extra: t.calendar.extra,
  makeup: t.calendar.makeup,
};

/** Hafta ko'rinishidagi dars bloki: vaqt, guruh, ustoz · xona, turi. */
export function LessonBlock({ l, onClick }: { l: LessonCell; onClick: () => void }) {
  const struck = l.kind === 'cancelled' && 'line-through';
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-0.5 rounded-md border-l-4 bg-bg p-2 text-left text-xs shadow-sm hover:bg-surface',
        BORDER[l.kind ?? 'regular'],
      )}
    >
      <span className={cn('font-semibold tabular-nums text-text', struck)}>
        {l.start}–{l.end}
      </span>
      <span className={cn('text-text', struck)}>{l.group}</span>
      <span className="text-text-muted">
        {l.teacher} · {l.room}
      </span>
      {l.kind && (
        <Badge tone={TONE[l.kind]} className="mt-0.5 self-start no-underline">
          {LABEL[l.kind]}
        </Badge>
      )}
    </button>
  );
}

/** Oy ko'rinishidagi ixcham qator: vaqt + guruh (turi — chap chiziq rangi va `title`). */
export function LessonChip({ l, onClick }: { l: LessonCell; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={l.kind ? LABEL[l.kind] : undefined}
      className={cn(
        'flex w-full gap-1 truncate rounded border-l-2 bg-bg px-1 py-0.5 text-left text-xs hover:bg-surface',
        BORDER[l.kind ?? 'regular'],
      )}
    >
      <span className="tabular-nums text-text-muted">{l.start}</span>
      <span className={cn('truncate text-text', l.kind === 'cancelled' && 'line-through')}>
        {l.group}
      </span>
    </button>
  );
}
