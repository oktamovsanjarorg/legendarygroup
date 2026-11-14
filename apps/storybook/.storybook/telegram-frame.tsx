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

function TopBar({ wa, back }: { wa: FakeWebApp; back: boolean }) {
  return (
    <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 text-sm text-text-muted">
      {back && (
        <button type="button" className="text-link" onClick={() => wa.BackButton.click()}>
          ‹ Orqaga
        </button>
      )}
      <span className="ml-auto">Telegram (fake)</span>
    </div>
  );
}

/** Pastki panel — webview'dan TASHQARIDA (haqiqiy Telegram'dagidek: webview qisqaradi). */
function BottomBar({ wa, s }: { wa: FakeWebApp; s: ReturnType<typeof useFakeState> }) {
  if (!s.main && !s.secondary) return null;
  const btn = 'min-h-11 flex-1 rounded-lg px-4 text-base font-semibold';
  return (
    <div className="flex shrink-0 gap-2 bg-surface p-3">
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
  );
}

function Shell({ wa, children }: { wa: FakeWebApp; children: ReactNode }) {
  const s = useFakeState(wa);
  return (
    <div className="mx-auto flex h-screen max-w-[420px] flex-col bg-surface">
      <TopBar wa={wa} back={s.back} />
      {/* "Webview": transform — ichidagi `fixed` (TabBar, sheet) shu maydonga nisbatan joylashadi. */}
      <div className="relative min-h-0 flex-1" style={{ transform: 'translateZ(0)' }}>
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
      <BottomBar wa={wa} s={s} />
    </div>
  );
}

/** `ui-tg` hikoyalari: fake WebApp + tanlangan Telegram temasi + native tugmalar vizuali. */
export function TelegramFrame({ theme, children }: { theme: string; children: ReactNode }) {
  const t = tgTheme(theme);
  const wa = useMemo(() => createFakeWebApp({ colorScheme: t.scheme, themeParams: t.params }), [t]);
  useEffect(() => applyTelegramTheme(wa), [wa]);
  return (
    <TelegramProvider webApp={wa}>
      <Shell wa={wa}>{children}</Shell>
    </TelegramProvider>
  );
}
