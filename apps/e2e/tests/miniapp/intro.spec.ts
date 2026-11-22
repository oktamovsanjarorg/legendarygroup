import { expect, test } from '@playwright/test';
import { miniappMessages as m } from '@lg/i18n';
import { fixtures } from '../../src/fixtures.js';
import { clickMainButton, mainButtonText, openMiniApp, signInitData } from '../../src/telegram.js';

const cards = m.intro.teacher;

test.describe('Mini App: birinchi ochilish tanishtiruvi (C-06, T-125)', () => {
  test('Ustoz: 3 kartochka → «Boshlash» → bosh sahifa', async ({ page }) => {
    const { attendance, telegramBotToken } = fixtures();
    const initData = signInitData(telegramBotToken, {
      id: attendance.teacherTelegramId,
      firstName: attendance.teacherFirstName,
    });
    await openMiniApp(page, { initData, startParam: null });

    for (const [i, card] of cards.entries()) {
      await expect(page.getByRole('heading', { name: card.title })).toBeVisible();
      await expect
        .poll(() => mainButtonText(page))
        .toBe(i === cards.length - 1 ? m.intro.start : m.intro.next);
      await clickMainButton(page);
    }
    await expect(page.getByRole('heading', { name: m.today.title })).toBeVisible();
  });
});
