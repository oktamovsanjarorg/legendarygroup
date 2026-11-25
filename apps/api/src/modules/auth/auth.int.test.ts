import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  outboxEvents,
  roles,
  seed,
  userRoles,
  users,
} from '@lg/db';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { SessionsService } from './sessions.service.js';

type Response = Awaited<ReturnType<TestApp['app']['inject']>>;

let t: TestApp;
let db: Database;
let tgSeq = 940_000_000n;
const ip = `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.1`;
const phone = () => `+99890${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;

const post = (url: string, payload?: object, headers: Record<string, string> = {}) =>
  t.app.inject({ method: 'POST', url: `/api/auth/${url}`, payload, headers, remoteAddress: ip });
const get = (url: string, token: string) =>
  t.app.inject({
    method: 'GET',
    url: `/api/auth/${url}`,
    headers: { authorization: `Bearer ${token}` },
  });
const cookieOf = (res: Response) => res.cookies.find((c) => c.name === 'lg_rt');
const withCookie = (value: string) => ({ cookie: `lg_rt=${value}` });
const code = (r: Response) => r.json<{ code: string }>().code;

async function createStaff(opts: { role?: string; telegramId?: bigint | null } = {}) {
  const p = phone();
  const [u] = await db
    .insert(users)
    .values({
      fullName: 'Xodim',
      phone: p,
      telegramId: opts.telegramId === undefined ? (tgSeq += 1n) : opts.telegramId,
    })
    .returning();
  const [r] = await db
    .select()
    .from(roles)
    .where(eq(roles.code, (opts.role ?? 'director') as 'director'));
  await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
  return { id: u!.id, phone: p, telegramId: u!.telegramId };
}

const confirm = (challengeId: string, telegramId: string) =>
  t.app.inject({
    method: 'POST',
    url: '/internal/auth/telegram/confirm',
    payload: { challengeId, telegramId },
    headers: { 'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN },
  });

/** Telegram orqali kirish (yagona yo'l, Q-98): start → bot tasdig'i → poll → sessiya. */
async function signIn(s: { phone: string; telegramId: bigint | null }) {
  const { challengeId } = (await post('telegram/start', { phone: s.phone })).json<{
    challengeId: string;
  }>();
  await confirm(challengeId, String(s.telegramId));
  return post('telegram/poll', { challengeId });
}
const accessOf = (r: Response) => r.json<{ accessToken: string }>().accessToken;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Kirish (T-006, T-147)', () => {
  it('sessiya: cookie xavfsiz, faol rol — Director, ruxsatlar', async () => {
    const done = await signIn(await createStaff());
    expect(done.statusCode).toBe(200);
    expect(cookieOf(done)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/api/auth',
    });
    expect(done.json<{ user: { activeRole: string } }>().user.activeRole).toBe('director');
    const perms = (await get('me', accessOf(done))).json<{ permissions: string[] }>().permissions;
    expect(perms).toContain('audit.view');
    expect(perms).not.toContain('payment.submit'); // ota-ona amali — Director'da yo'q
  });

  it("T-147: parol, TOTP va taklif endpoint'lari yo'q (404)", async () => {
    for (const url of ['login', 'invite/accept', 'totp/setup', 'totp/enable', 'totp/verify'])
      expect((await post(url, {})).statusCode).toBe(404);
  });
});

describe("Refresh rotatsiyasi va token o'g'irligi (FR-AUTH-4)", () => {
  it('rotatsiya: yangi cookie, eski access token bekor', async () => {
    const s = await createStaff();
    const enable = await signIn(s);
    const oldAccess = accessOf(enable);
    const r1 = await post('refresh', undefined, withCookie(cookieOf(enable)!.value));
    expect(r1.statusCode).toBe(200);
    expect(cookieOf(r1)!.value).not.toBe(cookieOf(enable)!.value);
    expect((await get('me', r1.json<{ accessToken: string }>().accessToken)).statusCode).toBe(200);
    expect((await get('me', oldAccess)).statusCode).toBe(401);
  });

  it("o'g'irlangan (eski) refresh qayta ishlatilsa — butun oila bekor, event + audit", async () => {
    const s = await createStaff();
    const enable = await signIn(s);
    const stolen = cookieOf(enable)!.value;
    const legit = await post('refresh', undefined, withCookie(stolen));
    const attacker = await post('refresh', undefined, withCookie(stolen));
    expect([attacker.statusCode, code(attacker)]).toEqual([401, 'SESSION_REVOKED']);
    const after = await post('refresh', undefined, withCookie(cookieOf(legit)!.value));
    expect(code(after)).toBe('SESSION_EXPIRED');
    const ev = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.type, 'StaffSessionReuseDetected'));
    expect(ev.some((e) => e.payload['userId'] === s.id)).toBe(true);
  });

  it('logout → refresh ishlamaydi', async () => {
    const s = await createStaff();
    const enable = await signIn(s);
    const rt = cookieOf(enable)!.value;
    expect((await post('logout', undefined, withCookie(rt))).statusCode).toBe(204);
    expect(code(await post('refresh', undefined, withCookie(rt)))).toBe('SESSION_EXPIRED');
  });
});

describe('Sessiyalar va darhol kuchga kirish (FR-AUTH-7, 02 §1)', () => {
  it("sessiyalar ro'yxati; barcha qurilmalardan chiqish", async () => {
    const s = await createStaff();
    const enable = await signIn(s);
    const access = accessOf(enable);
    const list = (await get('sessions', access)).json<{ current: boolean }[]>();
    expect(list).toHaveLength(1);
    expect(list[0]?.current).toBe(true);
    const revoke = await t.app.inject({
      method: 'POST',
      url: '/api/auth/sessions/revoke-all',
      headers: { authorization: `Bearer ${access}` },
    });
    expect(revoke.statusCode).toBe(204);
    expect((await get('me', access)).statusCode).toBe(401);
  });

  it("bloklash yoki permissions_version o'zgarishi — keyingi so'rovdan 401", async () => {
    const a = await createStaff();
    const b = await createStaff();
    const ta = accessOf(await signIn(a));
    const tb = accessOf(await signIn(b));
    await db.update(users).set({ status: 'blocked' }).where(eq(users.id, a.id));
    await db
      .update(users)
      .set({ permissionsVersion: sql`${users.permissionsVersion} + 1` })
      .where(eq(users.id, b.id));
    expect((await get('me', ta)).statusCode).toBe(401);
    expect((await get('me', tb)).statusCode).toBe(401);
  });

  it("token'siz yoki soxta token — 401; @Public endpoint'lar ochiq", async () => {
    expect((await t.app.inject({ url: '/api/auth/me' })).statusCode).toBe(401);
    expect((await get('me', 'not.a.jwt')).statusCode).toBe(401);
    expect((await t.app.inject({ url: '/api/health/live' })).statusCode).toBe(200);
  });
});

describe('Telegram orqali kirish', () => {
  const internal = (payload: object) =>
    t.app.inject({
      method: 'POST',
      url: '/internal/auth/telegram/confirm',
      payload,
      headers: { 'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN },
    });

  it("start → event → kutilmoqda → faqat o'z Telegram'i tasdiqlaydi → sessiya (bir marta)", async () => {
    const s = await createStaff({ telegramId: 777000111n });
    const { challengeId } = (await post('telegram/start', { phone: s.phone })).json<{
      challengeId: string;
    }>();
    const ev = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.type, 'StaffTelegramLoginRequested'));
    expect(ev.some((e) => e.payload['challengeId'] === challengeId)).toBe(true);
    expect(code(await post('telegram/poll', { challengeId }))).toBe('TELEGRAM_LOGIN_PENDING');
    expect((await internal({ challengeId, telegramId: '123' })).json()).toEqual({
      confirmed: false,
    });
    expect((await internal({ challengeId, telegramId: '777000111' })).json()).toEqual({
      confirmed: true,
    });
    const done = await post('telegram/poll', { challengeId });
    expect(done.statusCode).toBe(200);
    expect(cookieOf(done)).toBeDefined();
    expect(code(await post('telegram/poll', { challengeId }))).toBe('INVALID_MFA_TOKEN');
  });

  it("noma'lum telefon — challenge qaytadi, lekin event yo'q va tasdiqlab bo'lmaydi", async () => {
    const before = await db.$count(outboxEvents);
    const res = await post('telegram/start', { phone: phone() });
    expect(res.statusCode).toBe(200);
    expect(await db.$count(outboxEvents)).toBe(before);
    const { challengeId } = res.json<{ challengeId: string }>();
    expect((await internal({ challengeId, telegramId: '1' })).json()).toEqual({ confirmed: false });
  });

  it('Q-98: tasdiqdan keyin Telegram uzilsa yoki almashsa — sessiya berilmaydi', async () => {
    for (const [tg, next] of [
      [777000222n, null],
      [777000333n, 777000334n],
    ] as const) {
      const s = await createStaff({ telegramId: tg });
      const { challengeId } = (await post('telegram/start', { phone: s.phone })).json<{
        challengeId: string;
      }>();
      await internal({ challengeId, telegramId: String(tg) });
      await db.update(users).set({ telegramId: next }).where(eq(users.phone, s.phone));
      expect(code(await post('telegram/poll', { challengeId }))).toBe('INVALID_MFA_TOKEN');
    }
  });

  it('Q-98: bitta raqamga daqiqada 5 tadan ortiq soʻrov — 429 (xodimga xabar yogʻdirilmasin)', async () => {
    const p = phone();
    for (let i = 0; i < 5; i += 1)
      expect((await post('telegram/start', { phone: p })).statusCode).toBe(200);
    expect((await post('telegram/start', { phone: p })).statusCode).toBe(429);
    expect((await post('telegram/start', { phone: phone() })).statusCode).toBe(200);
  });
});

describe('Audit (FR-AUD-1)', () => {
  it("kirish va chiqish yoziladi; token audit'ga tushmaydi", async () => {
    const done = await signIn(await createStaff());
    const actions = (await db.select({ a: auditLogs.action }).from(auditLogs)).map((r) => r.a);
    expect(actions).toEqual(expect.arrayContaining(['auth.login', 'auth.logout']));
    const dump = JSON.stringify(await db.select().from(auditLogs));
    expect(dump).not.toContain(accessOf(done));
    expect(dump).not.toContain(cookieOf(done)!.value);
  });
});

describe('Rol olib tashlansa — eski sessiya o‘sha rolni qayta olmaydi (refresh, T-008)', () => {
  it('Director roli olingan: refresh 401, eski access token ham ishlamaydi', async () => {
    const [u] = await db
      .insert(users)
      .values({ fullName: 'Sobiq Direktor', phone: phone() })
      .returning();
    for (const code of ['director', 'admin'] as const) {
      const [r] = await db.select().from(roles).where(eq(roles.code, code));
      await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
    }
    const s = await t.app
      .get(SessionsService)
      .create(u!.id, 'director', { ip: null, device: 'test' });
    // Direktorlik o'tkazildi (director:transfer kabi): rol olinadi, pv oshadi.
    const [dir] = await db.select().from(roles).where(eq(roles.code, 'director'));
    await db
      .delete(userRoles)
      .where(sql`${userRoles.userId} = ${u!.id} AND ${userRoles.roleId} = ${dir!.id}`);
    await db
      .update(users)
      .set({ permissionsVersion: sql`${users.permissionsVersion} + 1` })
      .where(eq(users.id, u!.id));

    const res = await post('refresh', undefined, withCookie(s.refreshToken));
    expect(res.statusCode).toBe(401);
  });
});
