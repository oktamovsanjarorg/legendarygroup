import { expect, test } from '@playwright/test';
import { miniappMessages as m } from '@lg/i18n';
import { fixtures } from '../../src/fixtures.js';
import { clickMainButton, mainButtonText, openMiniApp, signInitData } from '../../src/telegram.js';

const a = m.attendance;

test.describe('Mini App: davomat (MT-02, FR-ATT-1, BR-30)', () => {
  test('Ustoz: bugungi dars → bitta “Kelmadi” → MainButton bilan saqlash', async ({ page }) => {
    const { attendance, telegramBotToken } = fixtures();
    const startParam = `att_${attendance.lessonId}`;
    const initData = signInitData(
      telegramBotToken,
      { id: attendance.teacherTelegramId, firstName: attendance.teacherFirstName },
      startParam,
    );
    await openMiniApp(page, { initData, startParam });

    const [first = '', ...rest] = attendance.students;
    const total = String(attendance.students.length);
    await expect(page.getByLabel(`${first}: ${a.present}`)).toBeVisible();
    for (const name of rest) await expect(page.getByLabel(`${name}: ${a.present}`)).toBeVisible();

    await page.getByLabel(`${first}: ${a.present}`).click();
    await expect(page.getByLabel(`${first}: ${a.absent}`)).toBeVisible();
    await expect
      .poll(() => mainButtonText(page))
      .toBe(a.save.replace('{present}', String(rest.length)).replace('{total}', total));

    const saved = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/attendance/lessons/${attendance.lessonId}`) &&
        r.request().method() !== 'GET',
    );
    await clickMainButton(page);
    expect((await saved).ok()).toBe(true);
    await expect(page.getByRole('status')).toContainText(a.saved.split('{time}')[0] ?? '');
  });
});

test.describe('Mini App: soxta initData (FR-AUTH-1, T-007)', () => {
  test('boshqa token bilan imzolangan initData — 401, maʼlumot koʻrinmaydi', async ({ page }) => {
    const { attendance } = fixtures();
    const startParam = `att_${attendance.lessonId}`;
    const initData = signInitData(
      '999999999:FORGED_token_not_the_real_bot_xx',
      { id: attendance.teacherTelegramId, firstName: attendance.teacherFirstName },
      startParam,
    );
    const auth = page.waitForResponse((r) => r.url().endsWith('/api/auth/telegram'));
    await openMiniApp(page, { initData, startParam });
    expect((await auth).status()).toBe(401);
    const [first = ''] = attendance.students;
    await expect(page.getByLabel(`${first}: ${a.present}`)).toHaveCount(0);
  });
});
