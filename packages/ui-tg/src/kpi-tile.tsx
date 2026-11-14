import type { ReactNode } from 'react';

interface Props {
  label: string;
  value: ReactNode;
  /** Qo'shimcha qator (masalan, "kecha: 82%"). */
  note?: string;
  tone?: 'default' | 'danger' | 'warning';
  onClick?: () => void;
}

const TONE = { default: 'text-text', danger: 'text-danger', warning: 'text-warning' };

/** Ixcham KPI (MS-01, FR-DASH-5): bosilsa — tegishli ro'yxat. */
export function KpiTile({ label, value, note, tone = 'default', onClick }: Props) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex min-h-24 flex-col items-start justify-between gap-1 rounded-xl bg-bg p-3 text-left active:bg-surface disabled:active:bg-bg"
    >
      <span className="text-sm text-text-muted">{label}</span>
      <span className={`text-2xl font-bold tabular-nums ${TONE[tone]}`}>{value}</span>
      {note && <span className="text-xs text-text-muted">{note}</span>}
    </button>
  );
}
