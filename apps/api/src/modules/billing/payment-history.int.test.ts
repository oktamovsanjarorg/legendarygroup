import type { PaymentHistory, PaymentView, RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { formatDateToYmd } from '@lg/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
const today = formatDateToYmd(new Date());
let key = 0;

const call = (method: 'GET' | 'POST', url: string, role: RoleCode, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    ...(payload ? { payload } : {}),
    headers: {
      authorization: `Bearer ${tokens.get(role) ?? ''}`,
      'idempotency-key': `ph-${process.pid}-${++key}`,
    },
  });
const history = async (q = '') =>
  (
    await call('GET', `billing/payments/history?from=${today}&to=${today}${q}`, 'admin')
  ).json<PaymentHistory>();

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('GET /billing/payments/history (T-153, MS-24)', () => {
  it('toʻlov, storno va qaytarish — bitta roʻyxatda; jami sof; sahifalash takrorsiz', async () => {
    const student = (await call('POST', 'students', 'admin', { fullName: 'Tarix Testov' })).json<{
      id: string;
    }>().id;
    const pay = async (amount: string, method: string) =>
      (
        await call('POST', 'billing/payments', 'admin', { studentId: student, amount, method })
      ).json<{ id: string }>().id;
    const wrong = await pay('100000', 'cash');
    await pay('300000', 'card');
    const reverse = { reason: 'Xato kiritilgan' };
    await call('POST', `billing/payments/${wrong}/reverse`, 'admin', reverse);
    await call('POST', 'billing/payments/refund', 'director', {
      studentId: student,
      amount: '50000',
      method: 'cash',
      reason: 'Ortiqcha toʻlangan',
    });

    const all = await history();
    expect(all.total).toBe('250000');
    expect(all.items.map((i) => [i.kind, i.amount, i.cancelled])).toEqual([
      ['refund', '-50000', false],
      ['reversal', '-100000', false],
      ['payment', '300000', false],
      ['payment', '100000', true],
    ]);
    expect(all.items[0]?.student).toBe('Tarix Testov');
    expect((await history('&method=card')).items).toHaveLength(1);

    const first = await history('&limit=3');
    const second = await history(`&limit=3&cursor=${first.nextCursor ?? ''}`);
    expect([...first.items, ...second.items].map((i) => i.id)).toEqual(all.items.map((i) => i.id));
    expect(second.nextCursor).toBeNull();

    // BR-16: storno qilingan to'lov va storno yozuvining o'zi qayta bekor qilinmaydi.
    for (const i of all.items.filter((x) => x.amount !== '300000')) {
      const view = await call('GET', `billing/payments/${i.id}/view`, 'director');
      expect(view.json<PaymentView>().canReverseNow).toBe(false);
    }
  });

  it('forbidden: ustoz (403), ota-ona (403); kelishmagan davr — 400', async () => {
    for (const role of ['teacher', 'guardian'] as const) {
      const res = await call('GET', `billing/payments/history?from=${today}&to=${today}`, role);
      expect(res.statusCode).toBe(403);
    }
    const bad = await call(
      'GET',
      'billing/payments/history?from=2026-02-02&to=2026-02-01',
      'admin',
    );
    expect(bad.statusCode).toBe(400);
  });
});
