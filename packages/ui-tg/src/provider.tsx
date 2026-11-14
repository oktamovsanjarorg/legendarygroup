import { createContext, type ReactNode, useContext } from 'react';
import type { WebApp } from './telegram.js';

const WebAppContext = createContext<WebApp | null>(null);

/** WebApp'ni daraxtga beradi — testda/Storybook'da fake (`createFakeWebApp`) uzatiladi. */
export function TelegramProvider({ webApp, children }: { webApp: WebApp; children: ReactNode }) {
  return <WebAppContext.Provider value={webApp}>{children}</WebAppContext.Provider>;
}

export function useWebApp(): WebApp {
  const wa = useContext(WebAppContext);
  if (!wa) throw new Error("useWebApp: TelegramProvider yo'q");
  return wa;
}
