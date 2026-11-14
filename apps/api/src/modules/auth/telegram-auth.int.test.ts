import { closeDb, createDb, type Database, roles, seed, userRoles, users } from '@lg/db';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { signInitData } from './telegram-init-data.js';

let t: TestApp;
let db: Database;
let tg = 900_000_000;

const initDataFor = (telegramId: number, ageS = 0, token: string = TEST_ENV.TELEGRAM_BOT_TOKEN) =>
  signInitData(
    {
      auth_date: String(Math.floor(Date.now() / 1000) - ageS),
      user: JSON.stringify({ id: telegramId, first_name: 'Ali', username: `u${telegramId}` }),
    },
    token,
  );

const exchange = (payload: object) =>
  t.app.inject({ method: 'POST', url: '/api/auth/telegram', payload });
const code = (r: { json: <T>() => T }) => r.json<{ code: string }>().code;

async function linkedUser(roleCodes: ('teacher' | 'guardian' | 'admin' | 'director')[]) {
  tg += 1;
  const [u] = await db
    .insert(users)
    .values({ fullName: 'Ustoz', phone: `+99893${String(tg).slice(-7)}`, telegramId: BigInt(tg) })
    .returning();
  for (const c of roleCodes) {
    const [r] = await db.select().from(roles).where(eq(roles.code, c));
    await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
  }
  return { id: u!.id, tg };
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Mini App kirishi (T-007, FR-AUTH-1/2/5)', () => {
  it('bitta rol — darhol token; token himoyalangan endpointda ishlaydi', async () => {
    const u = await linkedUser(['teacher']);
    const res = await exchange({ initData: initDataFor(u.tg) });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ next: string; accessToken: string; user: { activeRole: string } }>();
    expect(body).toMatchObject({ next: 'done', user: { activeRole: 'teacher' } });
    const me = await t.app.inject({
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${body.accessToken}` },
    });
    expect(me.statusCode).toBe(200);
  });

  it('bir nechta rol — avval tanlash; tanlangan rol bilan token; tayinlanmagan rol — 403', async () => {
    const u = await linkedUser(['teacher', 'guardian']);
    const first = await exchange({ initData: initDataFor(u.tg) });
    expect(first.json()).toEqual({
      next: 'choose_role',
      roles: expect.arrayContaining(['teacher', 'guardian']),
    });
    const chosen = await exchange({ initData: initDataFor(u.tg), role: 'guardian' });
    expect(chosen.json<{ user: { activeRole: string } }>().user.activeRole).toBe('guardian');
    expect(code(await exchange({ initData: initDataFor(u.tg), role: 'director' }))).toBe(
      'ROLE_NOT_ASSIGNED',
    );
  });

  it('soxta initData (boshqa bot tokeni) — 401 INVALID_INIT_DATA', async () => {
    const u = await linkedUser(['teacher']);
    const res = await exchange({
      initData: initDataFor(u.tg, 0, '1:fake_token_aaaaaaaaaaaaaaaaaaaa'),
    });
    expect([res.statusCode, code(res)]).toEqual([401, 'INVALID_INIT_DATA']);
  });

  it('eskirgan initData (24 soatdan ortiq) — 401', async () => {
    const u = await linkedUser(['teacher']);
    const res = await exchange({ initData: initDataFor(u.tg, 24 * 3600 + 60) });
    expect([res.statusCode, res.json<{ details: { reason: string } }>().details.reason]).toEqual([
      401,
      'EXPIRED',
    ]);
  });

  it("bog'lanmagan Telegram — 401 TELEGRAM_NOT_LINKED; bloklangan — 403", async () => {
    expect(code(await exchange({ initData: initDataFor(123_456_789) }))).toBe(
      'TELEGRAM_NOT_LINKED',
    );
    const u = await linkedUser(['teacher']);
    await db.update(users).set({ status: 'blocked' }).where(eq(users.id, u.id));
    expect(code(await exchange({ initData: initDataFor(u.tg) }))).toBe('ACCOUNT_BLOCKED');
  });

  it("rol olib qo'yilsa yoki pv o'zgarsa — sessiyasiz token ham darhol yaroqsiz", async () => {
    const u = await linkedUser(['teacher']);
    const token = (await exchange({ initData: initDataFor(u.tg) })).json<{ accessToken: string }>()
      .accessToken;
    const me = () =>
      t.app.inject({ url: '/api/auth/me', headers: { authorization: `Bearer ${token}` } });
    expect((await me()).statusCode).toBe(200);
    await db
      .update(users)
      .set({ permissionsVersion: sql`${users.permissionsVersion} + 1` })
      .where(eq(users.id, u.id));
    expect((await me()).statusCode).toBe(401);
  });
});
