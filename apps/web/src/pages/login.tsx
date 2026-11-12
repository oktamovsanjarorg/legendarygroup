import type { LoginResult } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle, Field } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth/auth.js';
import { type MfaNext, TotpSetupStep, TotpVerifyStep } from './mfa.js';

const POLL_MS = 2000;
const message = (e: unknown): string => (e instanceof ApiError ? e.message : String(e));

/** "Telegram orqali kirish" — bot tasdig'ini kutish (ADR 0006 §6). */
function TelegramWait({
  challengeId,
  onDone,
  onCancel,
}: {
  challengeId: string;
  onDone: (token: string) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    let stop = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      try {
        const r = await api.request<{ accessToken?: string; code?: string }>(
          '/auth/telegram/poll',
          { method: 'POST', body: { challengeId } },
        );
        if (stop) return;
        if (r.accessToken) return doneRef.current(r.accessToken);
        timer = setTimeout(() => void tick(), POLL_MS);
      } catch (e) {
        if (!stop) setError(message(e));
      }
    };
    void tick();
    return () => {
      stop = true;
      clearTimeout(timer);
    };
  }, [challengeId]);
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>{t.login.viaTelegram}</CardTitle>
      <p className="text-sm text-text-muted">{error ?? t.login.telegramWaiting}</p>
      <Button variant="secondary" onClick={onCancel}>
        {t.login.telegramCancel}
      </Button>
    </Card>
  );
}

type Step = MfaNext | { next: 'telegram'; challengeId: string } | null;

interface CredentialsProps {
  busy: boolean;
  error: string | null;
  onSubmit: (phone: string, password: string) => void;
  onTelegram: (phone: string) => void;
}

/** Telefon + parol formasi. */
function CredentialsForm({ busy, error, onSubmit, onTelegram }: CredentialsProps) {
  const [phone, setPhone] = useState('+998');
  const [password, setPassword] = useState('');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(phone.replaceAll(' ', ''), password);
  };
  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <CardTitle>{t.login.title}</CardTitle>
        <Field
          label={t.login.phone}
          type="tel"
          autoComplete="username"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Field
          label={t.login.password}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
        />
        <Button type="submit" size="full" loading={busy}>
          {t.login.submit}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="full"
          onClick={() => onTelegram(phone.replaceAll(' ', ''))}
        >
          {t.login.viaTelegram}
        </Button>
      </form>
    </Card>
  );
}

interface StepViewProps {
  step: Step;
  form: ReactNode;
  finish: (token: string) => void;
  reset: () => void;
}

function StepView({ step, form, finish, reset }: StepViewProps) {
  const done = (d: { accessToken: string }) => finish(d.accessToken);
  if (step?.next === 'totp_setup') return <TotpSetupStep mfaToken={step.mfaToken} onDone={done} />;
  if (step?.next === 'totp') return <TotpVerifyStep mfaToken={step.mfaToken} onDone={done} />;
  if (step?.next === 'telegram')
    return <TelegramWait challengeId={step.challengeId} onDone={finish} onCancel={reset} />;
  return form;
}

/** W-01: telefon + parol → MFA (W-02) yoki Telegram orqali. */
export function LoginPage({ initialStep }: { initialStep?: MfaNext }) {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<Step>(initialStep ?? null);

  const finish = async (accessToken: string) => {
    await signIn(accessToken);
    await navigate({ to: '/' });
  };

  const login = async (phone: string, password: string) => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.request<LoginResult>('/auth/login', {
        method: 'POST',
        body: { phone, password },
      });
      if (r.next === 'done') await finish(r.accessToken);
      else setStep(r);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  const viaTelegram = async (phone: string) => {
    setError(null);
    try {
      const r = await api.request<{ challengeId: string }>('/auth/telegram/start', {
        method: 'POST',
        body: { phone },
      });
      setStep({ next: 'telegram', challengeId: r.challengeId });
    } catch (err) {
      setError(message(err));
    }
  };

  const form = (
    <CredentialsForm
      busy={busy}
      error={error}
      onSubmit={(ph, pw) => void login(ph, pw)}
      onTelegram={(ph) => void viaTelegram(ph)}
    />
  );
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <StepView
        step={step}
        form={form}
        finish={(tok) => void finish(tok)}
        reset={() => setStep(null)}
      />
    </main>
  );
}
