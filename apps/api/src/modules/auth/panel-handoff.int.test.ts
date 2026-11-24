import { auditLogs, closeDb, createDb, type Database, roles, seed, userRoles, users } from '@lg/db';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { signInitData } from './telegram-init-data.js';

type Role = 'teacher' | 'guardian' | 'admin' | 'director';

let t: TestApp;
let db: Database;
let tg = 910_000_000;

const code = (r: { json: <T>() => T }) => r.json<{ code: string }>().code;
const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

/** Telegram'ga bog'langan xodim → Mini App access token. */
async function miniAppUser(role: Role) {
  tg += 1;
  const [u] = await db
    .insert(users)
    .values({ fullName: 'Xodim', phone: `+99894${String(tg).slice(-7)}`, telegramId: BigInt(tg) })
    .returning();
  const [r] = await db.select().from(roles).where(eq(roles.code, role));
  await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
  const initData = signInitData(
    {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: tg, first_name: 'X' }),
    },
    TEST_ENV.TELEGRAM_BOT_TOKEN,
  );
  const res = await t.app.inject({
    method: 'POST',
    url: '/api/auth/telegram',
    payload: { initData },
  });
  return { id: u!.id, token: res.json<{ accessToken: string }>().accessToken };
}

const issue = (accessToken?: string) =>
  t.app.inject({
    method: 'POST',
    url: '/api/auth/panel-handoff',
    headers: accessToken ? bearer(accessToken) : {},
  });
const redeem = (token: string) =>
  t.app.inject({ method: 'POST', url: '/api/auth/panel-handoff/redeem', payload: { token } });
const tokenOf = (url: string) => new URL(url).hash.replace('#t=', '');

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Mini App → web panel (T-121)', () => {
  it('Director: kalit → web sessiya (refresh cookie + access token), audit', async () => {
    const u = await miniAppUser('director');
    const res = await issue(u.token);
    expect(res.statusCode).toBe(200);
    const { url } = res.json<{ url: string }>();
    expect(url.startsWith(`${TEST_ENV.PUBLIC_APP_URL}/handoff#t=`)).toBe(true);

    const r = await redeem(tokenOf(url));
    expect(r.statusCode).toBe(200);
    expect(r.cookies.find((c) => c.name === 'lg_rt')?.httpOnly).toBe(true);
    const body = r.json<{ next: string; accessToken: string }>();
    expect(body.next).toBe('done');
    const me = await t.app.inject({ url: '/api/auth/me', headers: bearer(body.accessToken) });
    expect(me.json<{ activeRole: string }>().activeRole).toBe('director');

    const rows = await db.select().from(auditLogs).where(eq(auditLogs.actorId, u.id));
    const actions = rows.map((a) => [a.action, a.after]);
    expect(actions).toContainEqual(['auth.panel_handoff', null]);
    expect(actions).toContainEqual(['auth.login', { method: 'miniapp_handoff' }]);
  });

  it('Admin ham oladi; kalit bir martalik — ikkinchi marta 401', async () => {
    const u = await miniAppUser('admin');
    const token = tokenOf((await issue(u.token)).json<{ url: string }>().url);
    expect((await redeem(token)).statusCode).toBe(200);
    const again = await redeem(token);
    expect(again.statusCode).toBe(401);
    expect(code(again)).toBe('PANEL_HANDOFF_INVALID');
  });

  it.each<Role>(['teacher', 'guardian'])('forbidden: %s — web paneli yoʻq, 403', async (role) => {
    const u = await miniAppUser(role);
    const res = await issue(u.token);
    expect(res.statusCode).toBe(403);
    expect(code(res)).toBe('FORBIDDEN');
  });

  it('tokensiz — 401; soxta kalit — 401', async () => {
    expect((await issue()).statusCode).toBe(401);
    const bad = await redeem('x'.repeat(43));
    expect(bad.statusCode).toBe(401);
    expect(code(bad)).toBe('PANEL_HANDOFF_INVALID');
  });

  it('Q-98: kalit berilgach Telegram uzilsa (pv oshsa) — sessiya berilmaydi', async () => {
    const u = await miniAppUser('admin');
    const token = tokenOf((await issue(u.token)).json<{ url: string }>().url);
    await db
      .update(users)
      .set({ permissionsVersion: sql`${users.permissionsVersion} + 1` })
      .where(eq(users.id, u.id));
    expect((await redeem(token)).statusCode).toBe(401);
  });

  it('kalit berilgach bloklangan xodim — sessiya berilmaydi', async () => {
    const u = await miniAppUser('admin');
    const token = tokenOf((await issue(u.token)).json<{ url: string }>().url);
    await db.update(users).set({ status: 'blocked' }).where(eq(users.id, u.id));
    expect(code(await redeem(token))).toBe('PANEL_HANDOFF_INVALID');
  });
});
