import type { LoginResult } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, ErrorState, LoadingState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth/auth.js';

/** Kalit fragmentda (`#t=`): o'qilgach manzildan darhol olib tashlanadi (tarix/skrinshotda qolmaydi). */
function takeToken(): string | null {
  const token = new URLSearchParams(window.location.hash.slice(1)).get('t');
  window.history.replaceState(null, '', window.location.pathname);
  return token;
}

/** W-04: Mini App'dan "Boshqaruv paneli" (T-121) — bir martalik kalit → sessiya → bosh sahifa. */
export function HandoffPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // StrictMode effektni ikki marta chaqiradi — kalit bir martalik, so'rov bitta bo'lsin.
    if (started.current) return;
    started.current = true;
    const token = takeToken();
    if (!token) return setError(t.handoff.missing);
    api
      .request<LoginResult>('/auth/panel-handoff/redeem', { method: 'POST', body: { token } })
      .then(async (r) => {
        if (r.next !== 'done') throw new Error(t.handoff.missing);
        await signIn(r.accessToken);
        await navigate({ to: '/', replace: true });
      })
      .catch((e: unknown) => setError(e instanceof ApiError ? e.message : String(e)));
  }, [signIn, navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6">
      {error ? (
        <>
          <ErrorState message={error} />
          <Button size="full" onClick={() => void navigate({ to: '/login' })}>
            {t.handoff.toLogin}
          </Button>
        </>
      ) : (
        <>
          <p className="text-center text-sm text-text-muted">{t.handoff.loading}</p>
          <LoadingState rows={2} />
        </>
      )}
    </main>
  );
}
