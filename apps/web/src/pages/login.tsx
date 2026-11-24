import type { PublicSettings } from '@lg/contracts';
import { normalizePhone } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle, Field } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth/auth.js';
import { useTelegramPoll } from './telegram-poll.js';

const m = t.login;
const message = (e: unknown): string => (e instanceof ApiError ? e.message : String(e));

function BotLinkLine() {
  const pub = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: () => api.request<PublicSettings>('/settings/public'),
  });
  if (!pub.data) return null;
  return (
    <a
      className="text-sm font-medium text-primary underline"
      href={pub.data.botUrl}
      target="_blank"
      rel="noreferrer"
    >
      {m.openBot}
    </a>
  );
}

interface WaitProps {
  challengeId: string;
  onDone: (token: string) => void;
  onCancel: () => void;
}

/** Bot tasdig'ini kutish (ADR 0006 §6). Xabar kelmasa — sababi va yo'li shu yerda (Q-98). */
function TelegramWait({ challengeId, onDone, onCancel }: WaitProps) {
  const [error, setError] = useState<string | null>(null);
  useTelegramPoll(challengeId, onDone, (e) => setError(message(e)));
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>{m.waitingTitle}</CardTitle>
      <p role={error ? 'alert' : 'status'} className="text-sm text-text-muted">
        {error ?? m.telegramWaiting}
      </p>
      <p className="text-sm text-text-muted">{m.noMessage}</p>
      <BotLinkLine />
      <Button variant="secondary" onClick={onCancel}>
        {m.telegramCancel}
      </Button>
    </Card>
  );
}

interface FormProps {
  busy: boolean;
  error: string | null;
  onSubmit: (phone: string) => void;
}

function PhoneForm({ busy, error, onSubmit }: FormProps) {
  const [phone, setPhone] = useState('+998');
  const [invalid, setInvalid] = useState(false);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const normalized = normalizePhone(phone);
    setInvalid(!normalized);
    if (normalized) onSubmit(normalized);
  };
  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={submit} noValidate>
        <CardTitle>{m.title}</CardTitle>
        <p className="text-sm text-text-muted">{m.hint}</p>
        <Field
          label={m.phone}
          type="tel"
          autoComplete="username"
          autoFocus
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          error={invalid ? t.staff.form.phoneInvalid : error}
        />
        <Button type="submit" size="full" loading={busy}>
          {m.viaTelegram}
        </Button>
      </form>
    </Card>
  );
}

/** W-01: telefon → botda «Tasdiqlash» → panel. Parol va 2FA yo'q (Q-98). */
export function LoginPage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const finish = async (accessToken: string) => {
    await signIn(accessToken);
    await navigate({ to: '/' });
  };
  const start = async (phone: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.request<{ challengeId: string }>('/auth/telegram/start', {
        method: 'POST',
        body: { phone },
      });
      setChallengeId(r.challengeId);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      {challengeId ? (
        <TelegramWait
          challengeId={challengeId}
          onDone={(token) => void finish(token)}
          onCancel={() => setChallengeId(null)}
        />
      ) : (
        <PhoneForm busy={busy} error={error} onSubmit={(p) => void start(p)} />
      )}
    </main>
  );
}
