import { expect, test } from '@playwright/test';
import { miniappMessages as m, webMessages as t } from '@lg/i18n';
import { login, pickUser } from '../src/auth.js';
import { pickStudent } from '../src/fixtures.js';

const f = t.discounts.form;

test.describe('Web: tasdiqlash soʻrovi (W-31, T-119, BR-18)', () => {
  test('BR-18: Admin limitdan yuqori chegirma soʻraydi → Direktor tasdiqlaydi → chegirma qoʻyiladi', async ({
    page,
    browser,
  }, info) => {
    const student = pickStudent(info);
    const reason = `E2E koʻp bolali oila ${info.parallelIndex}-${info.retry}`;

    await login(page, pickUser('admin', info));
    await page.goto('/discounts');
    await page.getByRole('button', { name: t.discounts.grant }).click();
    const drawer = page.getByRole('dialog', { name: t.discounts.grant });
    await drawer.getByLabel(f.student).fill(student.fullName);
    await drawer.getByRole('button', { name: new RegExp(student.fullName) }).click();
    await drawer.getByLabel(f.percent).fill('25');
    await expect(drawer.getByText(f.overLimit.replace('{n}', '10'))).toBeVisible();
    await drawer.getByLabel(f.reason).fill(reason);
    await drawer.getByRole('button', { name: f.request }).click();
    await expect(page.getByText(f.sent)).toBeVisible();

    const director = await (await browser.newContext()).newPage();
    await login(director, pickUser('director', info));
    await director.goto('/approvals');
    await director.getByRole('row', { name: new RegExp(reason) }).click();
    await director.getByRole('button', { name: m.approvals.approve, exact: true }).click();
    await expect(director.getByRole('row', { name: new RegExp(reason) })).toHaveCount(0);

    await page.reload();
    const row = page.getByRole('row', { name: new RegExp(student.fullName) });
    await expect(row).toContainText('25');
  });
});
