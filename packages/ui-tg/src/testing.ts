import type { TelegramThemeParams } from '@lg/ui-core';
import type {
  BottomButton,
  BottomButtonParams,
  Insets,
  SimpleButton,
  TelegramEvent,
  WebApp,
} from './telegram.js';

/** Fake tugma holati — testda tekshiriladi. */
export interface FakeBottomButton extends BottomButton {
  params: BottomButtonParams;
  progress: boolean;
  click(): void;
}

export interface FakeSimpleButton extends SimpleButton {
  visible: boolean;
  click(): void;
}

function bottomButton(): FakeBottomButton {
  const handlers = new Set<() => void>();
  const b: FakeBottomButton = {
    params: { is_visible: false },
    progress: false,
    setParams: (p) => ((b.params = { ...b.params, ...p }), b),
    onClick: (cb) => (handlers.add(cb), b),
    offClick: (cb) => (handlers.delete(cb), b),
    showProgress: () => ((b.progress = true), b),
    hideProgress: () => ((b.progress = false), b),
    click: () => handlers.forEach((h) => h()),
  };
  return b;
}

function simpleButton(): FakeSimpleButton {
  const handlers = new Set<() => void>();
  const b: FakeSimpleButton = {
    visible: false,
    show: () => ((b.visible = true), b),
    hide: () => ((b.visible = false), b),
    onClick: (cb) => (handlers.add(cb), b),
    offClick: (cb) => (handlers.delete(cb), b),
    click: () => handlers.forEach((h) => h()),
  };
  return b;
}

export interface FakeWebApp extends WebApp {
  MainButton: FakeBottomButton;
  SecondaryButton: FakeBottomButton;
  BackButton: FakeSimpleButton;
  SettingsButton: FakeSimpleButton;
  closingConfirmation: boolean;
  closed: boolean;
  haptics: string[];
  storage: Map<string, string>;
  colors: { header?: string; background?: string; bottomBar?: string };
  /** Hodisani qo'lda chiqarish (masalan, tema o'zgardi). */
  emit(event: TelegramEvent): void;
}

export interface FakeOptions {
  version?: string;
  initData?: string;
  startParam?: string;
  colorScheme?: 'light' | 'dark';
  themeParams?: TelegramThemeParams;
  safeAreaInset?: Insets;
  contentSafeAreaInset?: Insets;
}

const cmp = (a: string, b: string): number => {
  const [x, y] = [a.split('.').map(Number), b.split('.').map(Number)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
};

/** Testlar va Storybook uchun Telegram WebApp o'rnini bosuvchi (holatni yozib boradi). */
export function createFakeWebApp(o: FakeOptions = {}): FakeWebApp {
  const listeners = new Map<TelegramEvent, Set<() => void>>();
  const version = o.version ?? '8.0';
  const wa: FakeWebApp = {
    initData: o.initData ?? 'query_id=fake&user=%7B%22id%22%3A1%7D&hash=fake',
    initDataUnsafe: { start_param: o.startParam },
    version,
    platform: 'tdesktop',
    colorScheme: o.colorScheme ?? 'light',
    themeParams: o.themeParams ?? {},
    safeAreaInset: o.safeAreaInset,
    contentSafeAreaInset: o.contentSafeAreaInset,
    isVersionAtLeast: (v) => cmp(version, v) >= 0,
    ready: () => undefined,
    expand: () => undefined,
    close: () => void (wa.closed = true),
    MainButton: bottomButton(),
    SecondaryButton: bottomButton(),
    BackButton: simpleButton(),
    SettingsButton: simpleButton(),
    HapticFeedback: {
      notificationOccurred: (t) => void wa.haptics.push(t),
      selectionChanged: () => void wa.haptics.push('selection'),
    },
    CloudStorage: {
      getItem: (k, cb) => cb(null, wa.storage.get(k) ?? ''),
      setItem: (k, v, cb) => (wa.storage.set(k, v), cb?.(null, true)),
      removeItem: (k, cb) => (wa.storage.delete(k), cb?.(null, true)),
    },
    enableClosingConfirmation: () => void (wa.closingConfirmation = true),
    disableClosingConfirmation: () => void (wa.closingConfirmation = false),
    setHeaderColor: (c) => void (wa.colors.header = c),
    setBackgroundColor: (c) => void (wa.colors.background = c),
    setBottomBarColor: (c) => void (wa.colors.bottomBar = c),
    onEvent: (e, cb) => void listeners.set(e, (listeners.get(e) ?? new Set()).add(cb)),
    offEvent: (e, cb) => void listeners.get(e)?.delete(cb),
    emit: (e) => listeners.get(e)?.forEach((cb) => cb()),
    closingConfirmation: false,
    closed: false,
    haptics: [],
    storage: new Map(),
    colors: {},
  };
  return wa;
}
