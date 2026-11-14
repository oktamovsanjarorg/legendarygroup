import type { ReactNode } from 'react';

export type ChipTone = 'success' | 'danger' | 'warning' | 'muted' | 'info';

const TONES: Record<ChipTone, string> = {
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
  warning: 'bg-warning-bg text-warning',
  muted: 'bg-surface-alt text-text-muted',
  info: 'bg-surface-alt text-link',
};

/** Holat belgisi: rang yagona belgi emas — ikon va matn ham (design-system §1). */
export function StatusChip({
  tone,
  icon,
  children,
}: {
  tone: ChipTone;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-medium tabular-nums ${TONES[tone]}`}
    >
      {icon}
      {children}
    </span>
  );
}
