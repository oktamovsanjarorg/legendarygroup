import { ApiError, errorText } from '@lg/ui-core';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@lg/ui-tg';
import type { UseQueryResult } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';

interface Props<T> {
  query: UseQueryResult<T>;
  /** Bo'sh holat: shart va matn (bo'lmasa — ma'lumot har doim ko'rsatiladi). */
  empty?: { when: (data: T) => boolean; title: string; hint?: string };
  rows?: number;
  children: (data: T) => ReactNode;
}

/**
 * Har ekranning 5 holati (CLAUDE.md, 11-ux §4): yuklanmoqda, bo'sh, xato (qayta urinish +
 * requestId), ruxsat yo'q (403). Offline — `AppLayout` chizig'i; keshdagi ma'lumot ko'rsatiladi.
 */
export function QueryView<T>({ query, empty, rows, children }: Props<T>) {
  const navigate = useNavigate();
  if (query.isPending) return <LoadingState rows={rows} />;
  if (query.isError) {
    const e = query.error;
    if (e instanceof ApiError && e.status === 403)
      return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
    return (
      <ErrorState
        message={errorText(e)}
        requestId={e instanceof ApiError ? e.requestId : undefined}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (empty?.when(query.data)) return <EmptyState title={empty.title} hint={empty.hint} />;
  return <>{children(query.data)}</>;
}
