import { resolveTelegramTheme, toCssVariables } from '@lg/ui-core';
import { type Insets, supports, type TelegramEvent, type WebApp } from './telegram.js';

const ZERO: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

/**
 * Xavfsiz zona (Bot API 8.0): qurilma (notch, gesture bar) + Telegram'ning o'z boshqaruvlari
 * (to'liq ekran rejimida yuqoridagi tugmalar). Natija — `--lg-safe-{top,bottom,left,right}`.
 */
export function safeAreaCss(wa: WebApp): string {
  const device = (supports(wa, 'safeArea') && wa.safeAreaInset) || ZERO;
  const content = (supports(wa, 'safeArea') && wa.contentSafeAreaInset) || ZERO;
  return (['top', 'bottom', 'left', 'right'] as const)
    .map((side) => `--lg-safe-${side}: ${device[side] + content[side]}px;`)
    .join('\n');
}

const EVENTS: TelegramEvent[] = ['themeChanged', 'safeAreaChanged', 'contentSafeAreaChanged'];

/**
 * Telegram temasi → tokenlar (11-ux §3): light/dark/custom; kontrast WCAG AA dan past juftlar
 * xavfsiz palitraga qaytadi (`resolveTelegramTheme`). Sarlavha, fon va pastki panel rangi ham
 * sahifa foniga moslanadi — "native" his. Tema/zona o'zgarsa — qayta qo'llanadi.
 * Qaytaradi: obunani bekor qilish funksiyasi.
 */
export function applyTelegramTheme(wa: WebApp, doc: Document = document): () => void {
  const style = doc.createElement('style');
  style.id = 'lg-theme';
  doc.head.append(style);
  const apply = () => {
    const { tokens } = resolveTelegramTheme(wa.themeParams, wa.colorScheme);
    style.textContent = `:root{${toCssVariables(tokens)}\n${safeAreaCss(wa)}\ncolor-scheme:${wa.colorScheme};}`;
    if (supports(wa, 'headerColor')) {
      wa.setHeaderColor(tokens.surface);
      wa.setBackgroundColor(tokens.surface);
    }
    if (supports(wa, 'bottomBarColor')) wa.setBottomBarColor?.(tokens.surface);
  };
  apply();
  for (const e of EVENTS) wa.onEvent(e, apply);
  return () => {
    for (const e of EVENTS) wa.offEvent(e, apply);
    style.remove();
  };
}
