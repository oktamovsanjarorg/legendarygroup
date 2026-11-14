import { webMessages as t } from '@lg/i18n';
import { AlertTriangle, Inbox, Lock, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from './button.js';
import { cn } from './cn.js';

/** 5 holat (11-ux §4.6, docs/ux/screens.md §0) — har ekran shularni ishlatadi. */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-surface-alt', className)} aria-hidden />;
}

export function LoadingState({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label={t.states.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  );
}

function Shell({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="text-text-muted">{icon}</div>
      <p className="text-base font-medium text-text">{title}</p>
      {children}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <Shell icon={<Inbox className="size-8" aria-hidden />} title={title}>
      {hint && <p className="text-sm text-text-muted">{hint}</p>}
      {action}
    </Shell>
  );
}

export function ErrorState({
  message,
  requestId,
  onRetry,
}: {
  message: string;
  requestId?: string;
  onRetry?: () => void;
}) {
  return (
    <Shell icon={<AlertTriangle className="size-8 text-danger" aria-hidden />} title={message}>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          {t.states.retry}
        </Button>
      )}
      {requestId && (
        <details className="text-xs text-text-muted">
          <summary>{t.states.details}</summary>
          <code>{requestId}</code>
        </details>
      )}
    </Shell>
  );
}

export function ForbiddenState({ onHome }: { onHome?: () => void }) {
  return (
    <Shell icon={<Lock className="size-8" aria-hidden />} title={t.states.forbiddenTitle}>
      {onHome && <Button onClick={onHome}>{t.states.forbiddenAction}</Button>}
    </Shell>
  );
}

export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning-bg px-4 py-1.5 text-sm text-warning"
    >
      <WifiOff className="size-4" aria-hidden />
      {t.states.offline}
    </div>
  );
}
