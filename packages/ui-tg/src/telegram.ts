import type { TelegramThemeParams } from '@lg/ui-core';

/**
 * Telegram WebApp API'ning bizga kerakli qismi (core.telegram.org/bots/webapps).
 * SDK paketi o'rniga rasmiy `telegram-web-app.js` + shu tiplar: bog'liqlik yo'q, fake bilan testlanadi.
 * Yangi imkoniyatlar `isVersionAtLeast` bilan tekshiriladi (`supports`), eski klientda jim o'tadi.
 */
export interface BottomButtonParams {
  text?: string;
  is_active?: boolean;
  is_visible?: boolean;
  has_shine_effect?: boolean;
  position?: 'left' | 'right' | 'top' | 'bottom';
}

export interface BottomButton {
  setParams(params: BottomButtonParams): BottomButton;
  onClick(cb: () => void): BottomButton;
  offClick(cb: () => void): BottomButton;
  showProgress(leaveActive?: boolean): BottomButton;
  hideProgress(): BottomButton;
}

export interface SimpleButton {
  show(): SimpleButton;
  hide(): SimpleButton;
  onClick(cb: () => void): SimpleButton;
  offClick(cb: () => void): SimpleButton;
}

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface CloudStorage {
  getItem(key: string, cb: (error: string | null, value?: string) => void): void;
  setItem(key: string, value: string, cb?: (error: string | null, ok?: boolean) => void): void;
  removeItem(key: string, cb?: (error: string | null, ok?: boolean) => void): void;
}

export type TelegramEvent =
  'themeChanged' | 'safeAreaChanged' | 'contentSafeAreaChanged' | 'viewportChanged';

export interface WebApp {
  initData: string;
  initDataUnsafe: { start_param?: string };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: TelegramThemeParams;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
  isVersionAtLeast(version: string): boolean;
  ready(): void;
  expand(): void;
  close(): void;
  MainButton: BottomButton;
  SecondaryButton: BottomButton;
  BackButton: SimpleButton;
  SettingsButton: SimpleButton;
  HapticFeedback: {
    notificationOccurred(type: 'error' | 'success' | 'warning'): void;
    selectionChanged(): void;
  };
  CloudStorage: CloudStorage;
  enableClosingConfirmation(): void;
  disableClosingConfirmation(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor(color: string): void;
  setBackgroundColor(color: string): void;
  setBottomBarColor?(color: string): void;
  onEvent(event: TelegramEvent, cb: () => void): void;
  offEvent(event: TelegramEvent, cb: () => void): void;
}

/** Imkoniyat → Bot API versiyasi (qaysi versiyadan bor). */
export const FEATURE_VERSION = {
  backButton: '6.1',
  haptic: '6.1',
  closingConfirmation: '6.2',
  headerColor: '6.9',
  cloudStorage: '6.9',
  settingsButton: '7.0',
  verticalSwipes: '7.7',
  secondaryButton: '7.10',
  bottomBarColor: '7.10',
  safeArea: '8.0',
} as const;

export type Feature = keyof typeof FEATURE_VERSION;

export const supports = (wa: WebApp, feature: Feature): boolean =>
  wa.isVersionAtLeast(FEATURE_VERSION[feature]);

declare global {
  interface Window {
    Telegram?: { WebApp?: WebApp };
  }
}

/** Telegram ichida ochilgan bo'lsa — WebApp, aks holda `null` (oddiy brauzer: initData bo'sh). */
export function getWebApp(win: Window = window): WebApp | null {
  const wa = win.Telegram?.WebApp;
  return wa && wa.initData.length > 0 ? wa : null;
}
