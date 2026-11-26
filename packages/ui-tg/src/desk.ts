import { useEffect, useState } from 'react';
import { supports, type WebApp } from './telegram.js';

/** Keng ekran chegarasi (Telegram Desktop, planshet) — T-164. CSS'dagi `desk:` varianti bilan bir xil. */
export const WIDE_QUERY = '(min-width: 900px)';

/** `true` — keng oyna: pastki menyu o'rniga yon panel. */
export function useWide(query = WIDE_QUERY): boolean {
  const get = () => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches;
  const [wide, setWide] = useState(get);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return;
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return wide;
}

/** Kompyuter mijozlari: Telegram Desktop, macOS va brauzerdagi Telegram (web.telegram.org). */
const DESKTOP = new Set(['tdesktop', 'macos', 'weba', 'webk', 'web']);

export const isDesktopClient = (wa: WebApp) => DESKTOP.has(wa.platform);

/** To'liq ekranni foydalanuvchi bosganda so'rash mumkinmi (tor oynadagi «Kengaytirish» tugmasi). */
export const canGoFullscreen = (wa: WebApp) =>
  isDesktopClient(wa) && supports(wa, 'fullscreen') && !wa.isFullscreen;

/**
 * Xodim kompyuterda (Telegram Desktop/macOS) — to'liq ekran (T-164, Q-115): sukut bo'yicha Mini App
 * tor oynada ochiladi va yon panel/yonma-yon ko'rinish ko'rinmaydi. Bir marta so'raladi.
 */
export function useDesktopFullscreen(wa: WebApp, on: boolean) {
  useEffect(() => {
    if (!on || !canGoFullscreen(wa)) return;
    wa.requestFullscreen?.();
  }, [wa, on]);
}

/** Klaviatura yorlig'i: macOS'da ⌘, boshqalarda Ctrl. */
export const modKey = (platform: string) => (platform === 'macos' ? '⌘' : 'Ctrl');

/** Ctrl/⌘ + `key` — global yorliq (masalan, buyruqlar oynasi). Matn maydonida ham ishlaydi. */
export function useHotkey(key: string, run: () => void, on = true) {
  useEffect(() => {
    if (!on) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === key) {
        e.preventDefault();
        run();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, run, on]);
}

const TYPING =
  'input:not([type=checkbox]):not([type=radio]):not([type=button]), textarea, select, [contenteditable=true]';

/**
 * Telefon klaviaturasi ochiqmi (matn maydonida fokus). Ochiq bo'lsa pastki menyu yashiriladi —
 * aks holda u klaviatura ustiga sakrab chiqib, yozish joyini yopadi (T-175).
 */
export function useTyping(): boolean {
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const check = () => setTyping(!!document.activeElement?.matches(TYPING));
    const later = () => setTimeout(check, 0);
    document.addEventListener('focusin', check);
    document.addEventListener('focusout', later);
    return () => {
      document.removeEventListener('focusin', check);
      document.removeEventListener('focusout', later);
    };
  }, []);
  return typing;
}
