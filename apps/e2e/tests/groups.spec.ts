import { expect, test } from '@playwright/test';
import { webMessages as t } from '@lg/i18n';
import { login, pickUser } from '../src/auth.js';
import { fixtures } from '../src/fixtures.js';

const f = t.groups.form;

test.describe('Web: guruh yaratish (W-10, FR-ORG-3, FR-ORG-4)', () => {
  test('Admin: kurs, ustoz va haftalik jadval bilan guruh → roʻyxatda', async ({ page }, info) => {
    const name = `E2E Kechki ${info.retry}-${info.parallelIndex}`;
    await login(page, pickUser('admin', info));
    await page.goto('/groups');
    await page.getByRole('button', { name: t.groups.new }).click();

    const drawer = page.getByRole('dialog', { name: t.groups.new });
    await drawer.getByLabel(f.name, { exact: true }).fill(name);
    await drawer.getByLabel(f.course, { exact: true }).selectOption({ label: 'E2E Matematika' });
    await drawer
      .getByLabel(f.teacher, { exact: true })
      .selectOption({ label: fixtures().teacher.fullName });
    await drawer.getByRole('button', { name: t.calendar.days[0] }).click();
    await drawer.getByRole('button', { name: t.calendar.days[2] }).click();
    await drawer.getByLabel(f.start, { exact: true }).fill('15:00');
    await drawer.getByLabel(f.end, { exact: true }).fill('16:30');
    await drawer.getByRole('button', { name: f.create }).click();

    await expect(drawer).toBeHidden();
    const row = page.getByRole('row', { name: new RegExp(name) });
    await expect(row).toBeVisible();
    await expect(row).toContainText(fixtures().teacher.fullName);
    await expect(row).toContainText('E2E Matematika');
  });
});
