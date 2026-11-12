import type { MeResult, RoleCode, TelegramAuthResult } from '@lg/contracts';
import { errorMessages } from '@lg/i18n';
import { type ApiClient, ApiError } from '@lg/ui-core';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { DeepLink } from '../deep-link.js';
import type { RoleStore } from './role-store.js';
import { signIn } from './sign-in.js';

export type SessionState =
  | { status: 'loading' }
  | { status: 'choose_role'; roles: RoleCode[] }
  | { status: 'not_linked' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; me: MeResult };

interface SessionValue {
  state: SessionState;
  /** Kirishdagi deep link (bo'lsa). */
  link: DeepLink | null;
  permissions: ReadonlySet<string>;
  /** C-02 / C-04: rolni tanlash yoki almashtirish (eslab qolinadi). */
  selectRole: (role: RoleCode) => Promise<void>;
  retry: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

interface ProviderProps {
  api: ApiClient;
  initData: string;
  store: RoleStore;
  link: DeepLink | null;
  /** API klient eskirgan tokenni yangilashda shu rolni oladi. */
  roleRef: { current: RoleCode | undefined };
  children: ReactNode;
}

export function SessionProvider({ api, initData, store, link, roleRef, children }: ProviderProps) {
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const linkRef = useRef(link);

  const exchange = useCallback(
    (role: RoleCode | undefined) =>
      api.request<TelegramAuthResult>('/auth/telegram', {
        method: 'POST',
        body: { initData, role },
        retry: false,
      }),
    [api, initData],
  );

  const apply = useCallback(
    async (r: TelegramAuthResult) => {
      if (r.next === 'choose_role') return setState({ status: 'choose_role', roles: r.roles });
      roleRef.current = r.user.activeRole;
      api.setToken(r.accessToken);
      setState({ status: 'ready', me: await api.request<MeResult>('/auth/me') });
    },
    [api, roleRef],
  );

  const fail = useCallback((e: unknown) => {
    if (e instanceof ApiError && e.code === 'TELEGRAM_NOT_LINKED')
      setState({ status: 'not_linked' });
    else setState({ status: 'error', error: e });
  }, []);

  useEffect(() => {
    api.onSessionEnd = () =>
      setState({
        status: 'error',
        error: new ApiError(401, 'INVALID_INIT_DATA', errorMessages.INVALID_INIT_DATA),
      });
    setState({ status: 'loading' });
    // Eskirgan urinish natijasi (StrictMode, "Qayta urinish") holatni bosib ketmasin.
    let live = true;
    signIn(exchange, store, linkRef.current)
      .then((r) => (live ? apply(r) : undefined))
      .catch((e: unknown) => live && fail(e));
    return () => {
      live = false;
    };
  }, [api, exchange, store, apply, fail, attempt]);

  const value = useMemo<SessionValue>(
    () => ({
      state,
      link,
      permissions: new Set(state.status === 'ready' ? state.me.permissions : []),
      selectRole: async (role) => {
        const r = await exchange(role);
        await store.set(role);
        await apply(r);
      },
      retry: () => setAttempt((n) => n + 1),
    }),
    [state, link, exchange, store, apply],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession: SessionProvider yo'q");
  return ctx;
}

/** Faqat `ready` holatda ishlatiladigan ekranlar uchun. */
export function useMe(): MeResult {
  const { state } = useSession();
  if (state.status !== 'ready') throw new Error('useMe: sessiya tayyor emas');
  return state.me;
}
