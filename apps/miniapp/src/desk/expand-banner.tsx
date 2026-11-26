import { miniappMessages as t } from '@lg/i18n';
import { canGoFullscreen, isDesktopClient, useWebApp } from '@lg/ui-tg';
import { Maximize2 } from 'lucide-react';

const d = t.desk;

/**
 * Kompyuterda oyna tor (T-175): Telegram to'liq ekranni avtomatik bermasa yoki foydalanuvchi
 * chiqib ketsa — yon panel ko'rinmaydi. Shu chiziq bir bosishda kengaytiradi.
 */
export function ExpandBanner({ on }: { on: boolean }) {
  const wa = useWebApp();
  if (!on || !isDesktopClient(wa)) return null;
  const can = canGoFullscreen(wa);
  return (
    <div className="flex items-center gap-3 border-b border-border bg-primary/10 px-4 py-2.5">
      <Maximize2 className="size-5 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1 text-sm leading-snug">
        <b className="text-text">{d.expandTitle}</b>
        <span className="block text-text-muted">{can ? d.expandHint : d.expandManual}</span>
      </p>
      {can && (
        <button
          type="button"
          onClick={() => wa.requestFullscreen?.()}
          className="min-h-10 shrink-0 rounded-lg bg-primary px-3 text-sm font-semibold text-primary-text"
        >
          {d.expand}
        </button>
      )}
    </div>
  );
}
