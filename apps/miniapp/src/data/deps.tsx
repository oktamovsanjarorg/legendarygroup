import type { Clock } from './clock.js';
import type { ApiClient } from '@lg/ui-core';
import { createContext, type ReactNode, useContext } from 'react';

/**
 * Ekranlar uchun bog'liqliklar: API klient (Telegram token bilan) va soat (CLAUDE.md —
 * `new Date()` emas, `Clock`; testda muzlatiladi).
 */
interface Deps {
  api: ApiClient;
  clock: Clock;
}

const DepsContext = createContext<Deps | null>(null);

export function DepsProvider({ children, ...deps }: Deps & { children: ReactNode }) {
  return <DepsContext.Provider value={deps}>{children}</DepsContext.Provider>;
}

function useDeps(): Deps {
  const deps = useContext(DepsContext);
  if (!deps) throw new Error("DepsProvider yo'q");
  return deps;
}

export const useApi = (): ApiClient => useDeps().api;
export const useClock = (): Clock => useDeps().clock;
