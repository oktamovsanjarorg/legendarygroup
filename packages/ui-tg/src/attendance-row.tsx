import { miniappMessages as t } from '@lg/i18n';
import { CheckCircle2, Clock4, FileText, XCircle } from 'lucide-react';
import { type ReactElement, useRef } from 'react';
import { type ChipTone, StatusChip } from './status-chip.js';

/** Davomat holati (FR-ATT-1). Standart — keldi (FR-ATT-2). */
export type AttendanceMark =
  | { kind: 'present' }
  | { kind: 'absent' }
  | { kind: 'late'; minutes: number }
  | { kind: 'excused' };

const LONG_PRESS_MS = 450;

export function markChip(mark: AttendanceMark): {
  tone: ChipTone;
  label: string;
  icon: ReactElement;
} {
  const icon = 'size-4';
  switch (mark.kind) {
    case 'present':
      return {
        tone: 'success',
        label: t.attendance.present,
        icon: <CheckCircle2 className={icon} aria-hidden />,
      };
    case 'absent':
      return {
        tone: 'danger',
        label: t.attendance.absent,
        icon: <XCircle className={icon} aria-hidden />,
      };
    case 'late':
      return {
        tone: 'warning',
        label: t.attendance.lateMinutes.replace('{n}', String(mark.minutes)),
        icon: <Clock4 className={icon} aria-hidden />,
      };
    case 'excused':
      return {
        tone: 'muted',
        label: t.attendance.excused,
        icon: <FileText className={icon} aria-hidden />,
      };
  }
}

interface Props {
  name: string;
  mark: AttendanceMark;
  /** Ota-ona oldindan "sababli" xabar bergan (FR-ATT-7). */
  preExcused?: boolean;
  /** Teginish: keldi ↔ kelmadi. */
  onToggle: () => void;
  /** Uzoq bosish: kech qoldi / sababli menyusi. */
  onMore: () => void;
  disabled?: boolean;
}

/** MT-02 qatori: butun qator — bitta katta teginish maydoni (20 kishi ≤ 20 s, 11-ux §5). */
export function AttendanceRow({ name, mark, preExcused, onToggle, onMore, disabled }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const long = useRef(false);
  const chip = markChip(mark);
  const start = () => {
    long.current = false;
    timer.current = setTimeout(() => {
      long.current = true;
      onMore();
    }, LONG_PRESS_MS);
  };
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  };
  return (
    <li className="border-b border-border last:border-0">
      <button
        type="button"
        disabled={disabled}
        aria-label={`${name}: ${chip.label}`}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onContextMenu={(e) => {
          e.preventDefault();
          if (!long.current) onMore();
          long.current = true;
        }}
        onClick={() => (long.current ? (long.current = false) : onToggle())}
        className="flex min-h-14 w-full select-none items-center gap-3 px-4 py-2 text-left active:bg-surface disabled:opacity-60"
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-base text-text">{name}</span>
          {preExcused && (
            <span className="flex items-center gap-1 text-sm text-text-muted">
              <FileText className="size-3.5" aria-hidden />
              {t.attendance.preExcused}
            </span>
          )}
        </span>
        <StatusChip tone={chip.tone} icon={chip.icon}>
          {chip.label}
        </StatusChip>
      </button>
    </li>
  );
}
