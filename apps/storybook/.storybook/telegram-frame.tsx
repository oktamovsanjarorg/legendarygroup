import { applyTelegramTheme, TelegramProvider } from '@lg/ui-tg';
import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { tgTheme } from './telegram-themes.js';

/** Fake Telegram boshqaruvlari holati (polling — faqat katalog uchun). */
function useFakeState(wa: FakeWebApp) {
  const read = () => ({
    main: wa.MainButton.params.is_visible ? wa.MainButton : null,
    secondary: wa.SecondaryButton.params.is_visible ? wa.SecondaryButton : null,
    back: wa.BackButton.visible,
  });
  const [s, set] = useState(read);
  useEffect(() => {
    const id = setInterval(() => set(read()), 150);
    return () => clearInterval(id);
  });
  return s;
}

function NativeChrome({ wa }: { wa: FakeWebApp }) {
  const s = useFakeState(wa);
  const btn = 'min-h-11 flex-1 rounded-lg px-4 text-base font-semibold';
  return (
    <>
      <div className="flex h-10 items-center gap-2 border-b border-border bg-surface px-3 text-sm text-text-muted">
        {s.back && (
          <button type="button" className="text-link" onClick={() => wa.BackButton.click()}>
            ‹ Orqaga
          </button>
        )}
        <span className="ml-auto">Telegram (fake)</span>
      </div>
      {(s.main || s.secondary) && (
        <div className="fixed inset-x-0 bottom-0 flex gap-2 bg-surface p-3">
          {s.secondary && (
            <button
              type="button"
              className={`${btn} bg-bg text-link`}
              onClick={() => wa.SecondaryButton.click()}
            >
              {s.secondary.params.text}
            </button>
          )}
          {s.main && (
            <button
              type="button"
              disabled={s.main.params.is_active === false}
              className={`${btn} bg-primary text-primary-text disabled:opacity-50`}
              onClick={() => wa.MainButton.click()}
            >
              {s.main.progress ? '…' : s.main.params.text}
            </button>
          )}
        </div>
      )}
    </>
  );
}

/** `ui-tg` hikoyalari: fake WebApp + tanlangan Telegram temasi + native tugmalar vizuali. */
export function TelegramFrame({ theme, children }: { theme: string; children: ReactNode }) {
  const t = tgTheme(theme);
  const wa = useMemo(() => createFakeWebApp({ colorScheme: t.scheme, themeParams: t.params }), [t]);
  useEffect(() => applyTelegramTheme(wa), [wa]);
  return (
    <TelegramProvider webApp={wa}>
      <div className="mx-auto min-h-screen max-w-[420px] bg-surface pb-20">
        <NativeChrome wa={wa} />
        {children}
      </div>
    </TelegramProvider>
  );
}
