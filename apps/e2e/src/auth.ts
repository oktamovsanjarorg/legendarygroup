import { expect, type Page, type TestInfo } from '@playwright/test';
import { webMessages as t } from '@lg/i18n';
import { Secret, TOTP } from 'otpauth';
import { type E2eUser, fixtures } from './fixtures.js';

const PERIOD = 30;
/** Worker ichida keyingi foydalanuvchi (hovuzdan aylanib). */
let next = 0;
/** Foydalanuvchi → oxirgi ishlatilgan TOTP hisoblagichi (server kodni qayta qabul qilmaydi). */
const lastCounter = new Map<string, number>();

/** Rol hovuzidan foydalanuvchi: parallel worker'lar bir-birining hisobini ishlatmaydi. */
export function pickUser(role: E2eUser['role'], info: TestInfo): E2eUser {
  const pool = fixtures().users[role];
  const workers = Math.max(1, info.config.workers);
  const user = pool[(info.parallelIndex + workers * next) % pool.length];
  next += 1;
  if (!user) throw new Error(`e2e hovuzi bo'sh: ${role}`);
  return user;
}

/** Joriy TOTP kodi; shu foydalanuvchi bu oynada kirgan bo'lsa — keyingi oynani kutadi. */
async function freshCode(user: E2eUser): Promise<string> {
  let counter = TOTP.counter({ period: PERIOD });
  if (lastCounter.get(user.id) === counter) {
    await new Promise((r) => setTimeout(r, TOTP.remaining({ period: PERIOD }) + 200));
    counter = TOTP.counter({ period: PERIOD });
  }
  lastCounter.set(user.id, counter);
  return TOTP.generate({ secret: Secret.fromBase32(user.totpSecret), period: PERIOD });
}

/** Tanishtiruv (T-124) e2e'da chiqmasin — `app-tour.tsx` kaliti. */
export async function skipTour(page: Page, user: E2eUser): Promise<void> {
  await page.addInitScript((id) => localStorage.setItem(`lg_tour_v1:${id}`, '1'), user.id);
}

/** Parol bosqichi (login sahifasida). */
export async function submitCredentials(page: Page, phone: string, password: string) {
  await page.goto('/login');
  await page.getByLabel(t.login.phone).fill(phone);
  await page.getByLabel(t.login.password).fill(password);
  await page.getByRole('button', { name: t.login.submit, exact: true }).click();
}

/** To'liq haqiqiy kirish: telefon + parol → TOTP → panel. */
export async function login(page: Page, user: E2eUser): Promise<void> {
  await skipTour(page, user);
  await submitCredentials(page, user.phone, user.password);
  await page.getByLabel(t.totp.code).fill(await freshCode(user));
  await page.getByRole('button', { name: t.totp.submit }).click();
  await expect(page.getByText(user.fullName, { exact: true })).toBeVisible();
}
