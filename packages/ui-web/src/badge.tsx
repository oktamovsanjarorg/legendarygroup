import type { ReactNode } from 'react';
import { cn } from './cn.js';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'muted' | 'info';

const TONES: Record<BadgeTone, string> = {
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
  warning: 'bg-warning-bg text-warning',
  muted: 'bg-surface-alt text-text-muted',
  info: 'bg-surface-alt text-link',
};

/** Holat belgisi (ui-tg StatusChip bilan bir xil tonlar): rang + matn. */
export function Badge({
  tone,
  children,
  className,
}: {
  tone: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium tabular-nums',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
