import { expect, test } from '@playwright/test';
import { webMessages as t } from '@lg/i18n';
import { login, pickUser, submitCredentials } from '../src/auth.js';

test.describe('Web: kirish (FR-AUTH-3, FR-AUTH-4)', () => {
  test('Direktor: parol + 2FA → panel; chiqish → login', async ({ page }, info) => {
    const user = pickUser('director', info);
    await login(page, user);
    await expect(page).not.toHaveURL(/\/login/);
    await page.getByRole('button', { name: t.nav.logout }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test("noto'g'ri parol — MFA bosqichiga o'tmaydi", async ({ page }, info) => {
    const user = pickUser('admin', info);
    await submitCredentials(page, user.phone, 'notogri-parol');
    await expect(page.getByLabel(t.totp.code)).toHaveCount(0);
    await expect(page).toHaveURL(/\/login/);
  });

  test("noto'g'ri 2FA kodi — panelga kirmaydi", async ({ page }, info) => {
    const user = pickUser('admin', info);
    await submitCredentials(page, user.phone, user.password);
    await page.getByLabel(t.totp.code).fill('000000');
    await page.getByRole('button', { name: t.totp.submit }).click();
    await expect(page.getByText(user.fullName, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel(t.totp.code)).toBeVisible();
  });
});
