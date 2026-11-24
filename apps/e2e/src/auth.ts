import { expect, type Page, type TestInfo } from '@playwright/test';
import { webMessages as t } from '@lg/i18n';
import { API_PORT } from './env.js';
import { type E2eUser, fixtures } from './fixtures.js';

/** Worker ichida keyingi foydalanuvchi (hovuzdan aylanib). */
let next = 0;
/** Rol hovuzidan foydalanuvchi: parallel worker'lar bir-birining hisobini ishlatmaydi. */
export function pickUser(role: E2eUser['role'], info: TestInfo): E2eUser {
  const pool = fixtures().users[role];
  const workers = Math.max(1, info.config.workers);
  const user = pool[(info.parallelIndex + workers * next) % pool.length];
  next += 1;
  if (!user) throw new Error(`e2e hovuzi bo'sh: ${role}`);
  return user;
}

/** Tanishtiruv (T-124) e2e'da chiqmasin — `app-tour.tsx` kaliti. */
export async function skipTour(page: Page, user: E2eUser): Promise<void> {
  await page.addInitScript((id) => localStorage.setItem(`lg_tour_v1:${id}`, '1'), user.id);
}

/** Telefonni yuborish (login sahifasida) → tasdiq so'rovi ID'si. */
export async function submitPhone(page: Page, phone: string): Promise<string> {
  await page.goto('/login');
  await page.getByLabel(t.login.phone).fill(phone);
  const started = page.waitForResponse((r) => r.url().endsWith('/auth/telegram/start'));
  await page.getByRole('button', { name: t.login.viaTelegram }).click();
  const body = (await (await started).json()) as { challengeId: string };
  return body.challengeId;
}

/** Botdagi «Tasdiqlash» o'rnida: bot chaqiradigan ichki endpoint, shu Telegram nomidan. */
export async function confirmInTelegram(challengeId: string, telegramId: string): Promise<boolean> {
  const res = await fetch(`http://127.0.0.1:${API_PORT}/internal/auth/telegram/confirm`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-internal-token': fixtures().internalToken },
    body: JSON.stringify({ challengeId, telegramId }),
  });
  return ((await res.json()) as { confirmed: boolean }).confirmed;
}

/** To'liq haqiqiy kirish: telefon → Telegram tasdig'i → panel (Q-98). */
export async function login(page: Page, user: E2eUser): Promise<void> {
  await skipTour(page, user);
  const challengeId = await submitPhone(page, user.phone);
  expect(await confirmInTelegram(challengeId, user.telegramId)).toBe(true);
  await expect(page.getByText(user.fullName, { exact: true })).toBeVisible();
}
