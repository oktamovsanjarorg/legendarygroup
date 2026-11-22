import { expect, test } from '@playwright/test';
import { formatMoney, webMessages as t } from '@lg/i18n';
import { login, pickUser } from '../src/auth.js';
import { pickStudent } from '../src/fixtures.js';

const [donePrefix = ''] = t.payEntry.done.split('{no}');

test.describe("Web: to'lov kiritish → chek (W-13, FR-PAY-1, FR-PAY-2)", () => {
  test("Admin: o'quvchi qidiruvi → qarz → naqd to'lov → chek PDF", async ({ page }, info) => {
    const admin = pickUser('admin', info);
    const student = pickStudent(info);
    await login(page, admin);
    await page.goto('/payments/new');

    await page.getByLabel(t.payEntry.student).fill(student.fullName);
    await page.getByRole('option', { name: new RegExp(student.fullName) }).click();
    // BR-12: joriy oy qarzi taqsimotda ko'rinadi.
    await page.getByLabel(t.payEntry.amount).fill(student.debt);
    await expect(page.getByText(formatMoney(BigInt(student.debt))).first()).toBeVisible();
    await page.getByRole('radio', { name: t.payEntry.methods.cash }).click();
    await page.getByRole('button', { name: t.payEntry.submit }).click();

    const done = page.getByText(donePrefix, { exact: false });
    await expect(done).toBeVisible();
    const receipt = /\S+/.exec(((await done.textContent()) ?? '').slice(donePrefix.length))?.[0];
    expect(receipt).toBeTruthy();

    const pdf = page.waitForResponse((r) => r.url().endsWith('/pdf'));
    await page.getByRole('button', { name: t.payEntry.printReceipt }).click();
    const res = await pdf;
    expect(res.url()).toContain(encodeURIComponent(receipt ?? ''));
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/pdf');
  });
});
