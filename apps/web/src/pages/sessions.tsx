import type { SessionInfo } from '@lg/contracts';
import { formatDate, formatTime, webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle, EmptyState, ErrorState, LoadingState } from '@lg/ui-web';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth/auth.js';

interface RowProps {
  s: SessionInfo;
  revoking: boolean;
  onRevoke: (id: string) => void;
}

function SessionRow({ s, revoking, onRevoke }: RowProps) {
  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <div>
        <p className="text-sm font-medium text-text">{s.device ?? t.sessions.unknownDevice}</p>
        <p className="text-xs text-text-muted">
          {formatDate(new Date(s.createdAt))} {formatTime(new Date(s.createdAt))}
          {s.ip ? ` · ${s.ip}` : ''}
          {s.current ? ` · ${t.sessions.current}` : ''}
        </p>
      </div>
      {!s.current && (
        <Button variant="secondary" size="sm" loading={revoking} onClick={() => onRevoke(s.id)}>
          {t.sessions.revoke}
        </Button>
      )}
    </li>
  );
}

/** W-32: o'z sessiyalari (FR-AUTH-7) — 5 holat bilan. */
export function SessionsPage() {
  const qc = useQueryClient();
  const { signOut } = useAuth();
  const sessions = useQuery({
    queryKey: ['sessions'],
    queryFn: () => api.request<SessionInfo[]>('/auth/sessions'),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api.request(`/auth/sessions/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  });
  const revokeAll = useMutation({
    mutationFn: () => api.request('/auth/sessions/revoke-all', { method: 'POST' }),
    onSuccess: () => void signOut(),
  });

  const body = sessions.isPending ? (
    <LoadingState />
  ) : sessions.isError ? (
    <ErrorState
      message={sessions.error instanceof ApiError ? sessions.error.message : String(sessions.error)}
      requestId={sessions.error instanceof ApiError ? sessions.error.requestId : undefined}
      onRetry={() => void sessions.refetch()}
    />
  ) : sessions.data.length === 0 ? (
    <EmptyState title={t.sessions.empty} />
  ) : (
    <ul className="divide-y divide-border">
      {sessions.data.map((s) => (
        <SessionRow
          key={s.id}
          s={s}
          revoking={revoke.isPending && revoke.variables === s.id}
          onRevoke={(id) => revoke.mutate(id)}
        />
      ))}
    </ul>
  );

  return (
    <Card className="max-w-3xl">
      <div className="mb-4 flex items-center justify-between">
        <CardTitle>{t.sessions.title}</CardTitle>
        <Button
          variant="danger"
          size="sm"
          loading={revokeAll.isPending}
          onClick={() => window.confirm(t.sessions.confirmRevokeAll) && revokeAll.mutate()}
        >
          {t.sessions.revokeAll}
        </Button>
      </div>
      {body}
    </Card>
  );
}
