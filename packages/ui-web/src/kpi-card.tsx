import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from './cn.js';

interface Props {
  label: string;
  value: ReactNode;
  /** O'zgarish matni va yo'nalishi (yaxshi/yomon — `good`). */
  delta?: { text: string; up: boolean; good: boolean };
  tone?: 'default' | 'danger' | 'warning';
  onClick?: () => void;
}

/** KPI (W-04, FR-DASH-1): qiymat + o'zgarish (↑↓, rang + belgi). */
export function KpiCard({ label, value, delta, tone = 'default', onClick }: Props) {
  const Arrow = delta?.up ? ArrowUpRight : ArrowDownRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="flex flex-col items-start gap-2 rounded-lg border border-border bg-bg p-5 text-left shadow-sm enabled:hover:border-primary/40"
    >
      <span className="text-sm text-text-muted">{label}</span>
      <span
        className={cn(
          'text-2xl font-semibold tabular-nums',
          tone === 'danger' ? 'text-danger' : tone === 'warning' ? 'text-warning' : 'text-text',
        )}
      >
        {value}
      </span>
      {delta && (
        <span
          className={cn(
            'flex items-center gap-1 text-xs',
            delta.good ? 'text-success' : 'text-danger',
          )}
        >
          <Arrow className="size-3.5" aria-hidden />
          {delta.text}
        </span>
      )}
    </button>
  );
}
