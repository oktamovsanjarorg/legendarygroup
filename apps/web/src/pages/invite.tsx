import type { LoginResult } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle, Field } from '@lg/ui-web';
import { type FormEvent, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { LoginPage } from './login.js';
import type { MfaNext } from './mfa.js';

/** W-03: taklif havolasi `/invite/<token>` → parol → TOTP sozlash (W-02). */
export function InvitePage({ token }: { token: string }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<MfaNext | null>(null);

  if (next) return <LoginPage initialStep={next} />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError(t.invite.mismatch);
    setBusy(true);
    setError(null);
    try {
      const r = await api.request<LoginResult>('/auth/invite/accept', {
        method: 'POST',
        body: { token, password },
      });
      if (r.next !== 'done') setNext(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <Card>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <CardTitle>{t.invite.title}</CardTitle>
          <Field
            label={t.invite.password}
            type="password"
            autoComplete="new-password"
            hint={t.invite.hint}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Field
            label={t.invite.confirm}
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={error}
          />
          <Button type="submit" size="full" loading={busy} disabled={password.length < 10}>
            {t.invite.submit}
          </Button>
        </form>
      </Card>
    </main>
  );
}
