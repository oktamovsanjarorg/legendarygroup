import type { MeResult } from '@lg/contracts';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { api } from '../api/client.js';

type Status = 'loading' | 'anonymous' | 'authenticated';

interface AuthValue {
  status: Status;
  me: MeResult | null;
  permissions: ReadonlySet<string>;
  signIn: (accessToken: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** Sessiya holati: sahifa ochilganda cookie orqali tiklanadi; token faqat xotirada. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<MeResult | null>(null);

  const loadMe = useCallback(async () => {
    setMe(await api.request<MeResult>('/auth/me'));
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    api.onSessionEnd = () => {
      setMe(null);
      setStatus('anonymous');
    };
    void api.restore().then((ok) => (ok ? loadMe() : setStatus('anonymous')));
  }, [loadMe]);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      me,
      permissions: new Set(me?.permissions ?? []),
      signIn: async (token) => {
        api.setToken(token);
        await loadMe();
      },
      signOut: async () => {
        await api.request('/auth/logout', { method: 'POST' }).catch(() => undefined);
        api.setToken(null);
        setMe(null);
        setStatus('anonymous');
      },
    }),
    [status, me, loadMe],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth: AuthProvider yo'q");
  return ctx;
}
