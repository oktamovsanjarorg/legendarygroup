import { expect, test } from '@playwright/test';
import { webMessages as t } from '@lg/i18n';
import { confirmInTelegram, login, pickUser, submitPhone } from '../src/auth.js';

test.describe('Web: kirish faqat Telegram orqali (FR-AUTH-3, Q-98)', () => {
  test('Direktor: telefon → Telegram tasdigʻi → panel; chiqish → login', async ({ page }, info) => {
    const user = pickUser('director', info);
    await login(page, user);
    await expect(page).not.toHaveURL(/\/login/);
    await page.getByRole('button', { name: t.nav.logout }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('begona Telegram tasdiqlay olmaydi — panelga kirmaydi', async ({ page }, info) => {
    const user = pickUser('admin', info);
    const challengeId = await submitPhone(page, user.phone);
    expect(await confirmInTelegram(challengeId, '1')).toBe(false);
    await expect(page.getByText(t.login.noMessage)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('nomaʼlum raqam — xodim bor-yoʻqligi bilinmaydi, kutish ekrani', async ({ page }) => {
    await submitPhone(page, '+998990000000');
    await expect(page.getByText(t.login.telegramWaiting)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });
});
