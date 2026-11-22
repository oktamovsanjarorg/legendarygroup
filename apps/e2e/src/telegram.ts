import { createHmac } from 'node:crypto';
import type { Page } from '@playwright/test';

/**
 * Telegram Mini App muhiti (06 §4: "mock Telegram"): server tekshiradigan haqiqiy HMAC
 * imzoli `initData` (core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
 * va `window.Telegram.WebApp` o'rnini bosuvchi — MainButton DOM'da yo'q, testdan bosiladi.
 */
export function signInitData(
  botToken: string,
  user: { id: string; firstName: string },
  startParam?: string,
): string {
  const params = new URLSearchParams({
    auth_date: String(Math.floor(Date.now() / 1000)),
    query_id: 'AAE2E',
    user: JSON.stringify({ id: Number(user.id), first_name: user.firstName }),
    ...(startParam ? { start_param: startParam } : {}),
  });
  const check = [...params.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  params.set('hash', createHmac('sha256', secret).update(check).digest('hex'));
  return params.toString();
}

interface FakeInit {
  initData: string;
  startParam: string | null;
}

/** Brauzerda ishlaydi (serializatsiya qilinadi) — tashqi o'zgaruvchilarga murojaat yo'q. */
function installFakeWebApp({ initData, startParam }: FakeInit): void {
  const noop = () => undefined;
  const NOOPS = `ready expand close openLink enableClosingConfirmation disableClosingConfirmation
    disableVerticalSwipes setHeaderColor setBackgroundColor setBottomBarColor onEvent offEvent`;
  const bottom = () => {
    const handlers = new Set<() => void>();
    const b = {
      params: {} as Record<string, unknown>,
      setParams: (p: Record<string, unknown>) => ((b.params = { ...b.params, ...p }), b),
      onClick: (cb: () => void) => (handlers.add(cb), b),
      offClick: (cb: () => void) => (handlers.delete(cb), b),
      showProgress: () => b,
      hideProgress: () => b,
      click: () => handlers.forEach((h) => h()),
    };
    return b;
  };
  const simple = () => {
    const handlers = new Set<() => void>();
    const b = {
      show: () => b,
      hide: () => b,
      onClick: (cb: () => void) => (handlers.add(cb), b),
      offClick: (cb: () => void) => (handlers.delete(cb), b),
      click: () => handlers.forEach((h) => h()),
    };
    return b;
  };
  const store = new Map<string, string>();
  (window as unknown as { Telegram: unknown }).Telegram = {
    WebApp: {
      initData,
      initDataUnsafe: startParam ? { start_param: startParam } : {},
      version: '8.0',
      platform: 'tdesktop',
      colorScheme: 'light',
      themeParams: {},
      isVersionAtLeast: (v: string) => Number(v) <= 8,
      ...Object.fromEntries(NOOPS.split(/\s+/).map((k) => [k, noop])),
      MainButton: bottom(),
      SecondaryButton: bottom(),
      BackButton: simple(),
      SettingsButton: simple(),
      HapticFeedback: { notificationOccurred: noop, selectionChanged: noop, impactOccurred: noop },
      CloudStorage: {
        getItem: (k: string, cb: (e: null, v?: string) => void) => cb(null, store.get(k) ?? ''),
        setItem: (k: string, v: string, cb?: (e: null, ok: boolean) => void) => {
          store.set(k, v);
          cb?.(null, true);
        },
        removeItem: (k: string, cb?: (e: null, ok: boolean) => void) => {
          store.delete(k);
          cb?.(null, true);
        },
      },
    },
  };
}

/** Rasmiy `telegram-web-app.js` o'rniga fake (tarmoqqa chiqmaydi, fake'ni ustidan yozmaydi). */
export async function openMiniApp(page: Page, init: FakeInit): Promise<void> {
  await page.route('https://telegram.org/**', (r) =>
    r.fulfill({ contentType: 'application/javascript', body: '' }),
  );
  await page.addInitScript(installFakeWebApp, init);
  await page.goto('/');
}

/** MainButton matni (Telegram'ning native tugmasi — DOM'da yo'q). */
export const mainButtonText = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const wa = (window as unknown as { Telegram: { WebApp: { MainButton: { params: object } } } })
      .Telegram.WebApp;
    return String((wa.MainButton.params as { text?: string }).text ?? '');
  });

export const clickMainButton = (page: Page): Promise<void> =>
  page.evaluate(() => {
    (
      window as unknown as { Telegram: { WebApp: { MainButton: { click(): void } } } }
    ).Telegram.WebApp.MainButton.click();
  });
