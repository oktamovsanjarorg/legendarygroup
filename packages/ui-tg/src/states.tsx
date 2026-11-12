import { miniappMessages as t } from '@lg/i18n';
import { AlertTriangle, Inbox, Lock, WifiOff } from 'lucide-react';
import type { ReactNode } from 'react';

/**
 * 5 holat, Mini App varianti (11-ux §4.6, screens.md §0): matn ≥ 16 px, teginish ≥ 44 px.
 * Ekranning asosiy amali (masalan, "Qayta urinish") ham ichki tugma — u "Orqaga" emas.
 */

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-bg ${className}`} aria-hidden />;
}

export function LoadingState({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2 p-4" role="status" aria-label={t.states.loading}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function InlineButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 rounded-lg px-4 text-base font-semibold text-link active:opacity-60"
    >
      {children}
    </button>
  );
}

interface ShellProps {
  icon: ReactNode;
  title: string;
  hint?: string;
  children?: ReactNode;
}

export function StateShell({ icon, title, hint, children }: ShellProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-8 text-center">
      <div className="text-text-muted">{icon}</div>
      <p className="text-lg font-semibold text-text">{title}</p>
      {hint && <p className="text-base text-text-muted">{hint}</p>}
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
    <StateShell icon={<Inbox className="size-10" aria-hidden />} title={title} hint={hint}>
      {action}
    </StateShell>
  );
}

interface ErrorProps {
  message: string;
  requestId?: string;
  onRetry?: () => void;
}

export function ErrorState({ message, requestId, onRetry }: ErrorProps) {
  return (
    <StateShell
      icon={<AlertTriangle className="size-10 text-danger" aria-hidden />}
      title={message}
    >
      {onRetry && <InlineButton onClick={onRetry}>{t.states.retry}</InlineButton>}
      {requestId && (
        <details className="text-sm text-text-muted">
          <summary>{t.states.details}</summary>
          <code>{requestId}</code>
        </details>
      )}
    </StateShell>
  );
}

export function ForbiddenState({ onHome }: { onHome?: () => void }) {
  return (
    <StateShell icon={<Lock className="size-10" aria-hidden />} title={t.states.forbiddenTitle}>
      {onHome && <InlineButton onClick={onHome}>{t.states.forbiddenAction}</InlineButton>}
    </StateShell>
  );
}

/** Tarmoq yo'q — yuqorida ingichka chiziq (11-ux §4.7). */
export function OfflineBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-warning-bg px-4 py-1 text-sm text-warning"
    >
      <WifiOff className="size-4" aria-hidden />
      {t.states.offline}
    </div>
  );
}
