import type { RoleCode } from '@lg/contracts';
import { errorMessages, isErrorCode, miniappMessages as t } from '@lg/i18n';
import { ApiError, errorText } from '@lg/ui-core';
import {
  ErrorState,
  LoadingState,
  StateShell,
  useHaptic,
  useMainButton,
  useWebApp,
} from '@lg/ui-tg';
import { Link2Off } from 'lucide-react';
import { useState } from 'react';
import { useSession } from '../session/session.js';
import { RoleList } from './role-list.js';

/** C-02: bir nechta rol — tanlash (eslab qolinadi). */
export function ChooseRolePage({ roles }: { roles: RoleCode[] }) {
  const { selectRole } = useSession();
  const h = useHaptic();
  const [busy, setBusy] = useState<RoleCode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pick = async (role: RoleCode) => {
    h.selection();
    setBusy(role);
    setError(null);
    try {
      await selectRole(role);
    } catch (e) {
      h.error();
      setError(errorText(e));
      setBusy(null);
    }
  };
  return (
    <main className="flex flex-col gap-3 p-4">
      <h1 className="px-1 text-xl font-semibold text-text">{t.chooseRole.title}</h1>
      <RoleList roles={roles} busy={busy} onSelect={(r) => void pick(r)} />
      <p className="px-1 text-sm text-text-muted">{error ?? t.chooseRole.hint}</p>
    </main>
  );
}

/** C-03: Telegram akkaunti bog'lanmagan — botga qaytish (`/start` → telefon ulashish). */
export function NotLinkedPage() {
  const wa = useWebApp();
  useMainButton({ text: t.notLinked.backToBot, onClick: () => wa.close() });
  return (
    <StateShell
      icon={<Link2Off className="size-10" aria-hidden />}
      title={t.notLinked.title}
      hint={errorMessages.TELEGRAM_NOT_LINKED}
    />
  );
}

const messageOf = (e: unknown): string =>
  e instanceof ApiError && isErrorCode(e.code) && !e.message ? errorMessages[e.code] : errorText(e);

/** C-01: splash va kirish xatolari. */
export function SessionGate({ children }: { children: React.ReactNode }) {
  const { state, retry } = useSession();
  switch (state.status) {
    case 'loading':
      return <LoadingState />;
    case 'choose_role':
      return <ChooseRolePage roles={state.roles} />;
    case 'not_linked':
      return <NotLinkedPage />;
    case 'error':
      return (
        <ErrorState
          message={messageOf(state.error)}
          requestId={state.error instanceof ApiError ? state.error.requestId : undefined}
          onRetry={retry}
        />
      );
    case 'ready':
      return <>{children}</>;
  }
}
