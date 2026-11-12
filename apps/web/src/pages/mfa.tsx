import type { LoginResult } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Button, Card, CardTitle, Field } from '@lg/ui-web';
import QRCode from 'qrcode';
import { type FormEvent, useEffect, useState } from 'react';
import { api, ApiError } from '../api/client.js';

interface Done {
  accessToken: string;
}

const message = (e: unknown): string => (e instanceof ApiError ? e.message : String(e));

/** Zaxira kodlar — faqat bir marta ko'rsatiladi (ADR 0006). */
function BackupCodes({ codes, onContinue }: { codes: string[]; onContinue: () => void }) {
  return (
    <Card className="flex flex-col gap-4">
      <CardTitle>{t.totp.backupTitle}</CardTitle>
      <p className="text-sm text-text-muted">{t.totp.backupHint}</p>
      <ul className="grid grid-cols-2 gap-2 font-mono text-sm" aria-label={t.totp.backupTitle}>
        {codes.map((c) => (
          <li key={c} className="rounded-sm bg-surface px-2 py-1 text-center">
            {c}
          </li>
        ))}
      </ul>
      <Button size="full" onClick={onContinue}>
        {t.totp.backupDone}
      </Button>
    </Card>
  );
}

/** `/auth/totp/setup` — QR va secret'ni yuklaydi. */
function useTotpSetup(mfaToken: string, onError: (m: string) => void) {
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  useEffect(() => {
    void api
      .request<{ otpauthUrl: string; secret: string }>('/auth/totp/setup', {
        method: 'POST',
        body: { mfaToken },
      })
      .then(async (r) =>
        setSetup({
          qr: await QRCode.toDataURL(r.otpauthUrl, { margin: 1, width: 220 }),
          secret: r.secret,
        }),
      )
      .catch((e: unknown) => onError(message(e)));
  }, [mfaToken, onError]);
  return setup;
}

function SetupQr({ qr, secret }: { qr: string; secret: string }) {
  return (
    <>
      <img src={qr} alt="QR" className="mx-auto size-56 rounded-md bg-white p-2" />
      <p className="break-all text-center font-mono text-xs text-text-muted">
        {t.totp.secretLabel}: {secret}
      </p>
    </>
  );
}

/** W-02: TOTP sozlash (birinchi kirish) — QR, kod, so'ng zaxira kodlar (bir marta). */
export function TotpSetupStep({
  mfaToken,
  onDone,
}: {
  mfaToken: string;
  onDone: (d: Done) => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setup = useTotpSetup(mfaToken, setError);
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<{ codes: string[]; token: string } | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.request<{ accessToken: string; backupCodes: string[] }>(
        '/auth/totp/enable',
        { method: 'POST', body: { mfaToken, code } },
      );
      setBackup({ codes: r.backupCodes, token: r.accessToken });
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  if (backup)
    return (
      <BackupCodes codes={backup.codes} onContinue={() => onDone({ accessToken: backup.token })} />
    );

  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <CardTitle>{t.totp.setupTitle}</CardTitle>
        <p className="text-sm text-text-muted">{t.totp.setupHint}</p>
        {setup && <SetupQr qr={setup.qr} secret={setup.secret} />}
        <Field
          label={t.totp.code}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          error={error}
        />
        <Button type="submit" size="full" loading={busy} disabled={code.length !== 6}>
          {t.totp.submit}
        </Button>
      </form>
    </Card>
  );
}

/** W-02: TOTP yoki zaxira kod. */
export function TotpVerifyStep({
  mfaToken,
  onDone,
}: {
  mfaToken: string;
  onDone: (d: Done) => void;
}) {
  const [useBackup, setUseBackup] = useState(false);
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = useBackup
        ? { mfaToken, backupCode: value.trim() }
        : { mfaToken, code: value.trim() };
      onDone(await api.request<Done>('/auth/totp/verify', { method: 'POST', body }));
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <CardTitle>{t.totp.verifyTitle}</CardTitle>
        <p className="text-sm text-text-muted">{t.totp.verifyHint}</p>
        <Field
          label={useBackup ? t.totp.backupCode : t.totp.code}
          inputMode={useBackup ? 'text' : 'numeric'}
          autoComplete="one-time-code"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          error={error}
        />
        <Button type="submit" size="full" loading={busy} disabled={value.trim().length < 6}>
          {t.totp.submit}
        </Button>
        <Button type="button" variant="link" onClick={() => setUseBackup((b) => !b)}>
          {useBackup ? t.totp.code : t.totp.useBackup}
        </Button>
      </form>
    </Card>
  );
}

export type MfaNext = Extract<LoginResult, { next: 'totp' | 'totp_setup' }>;
