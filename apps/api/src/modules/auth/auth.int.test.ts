import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  outboxEvents,
  roles,
  seed,
  staffInvites,
  userRoles,
  users,
} from '@lg/db';
import { eq, sql } from 'drizzle-orm';
import { Secret, TOTP } from 'otpauth';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { hashPassword, randomToken, sha256 } from './crypto.js';

type Response = Awaited<ReturnType<TestApp['app']['inject']>>;

let t: TestApp;
let db: Database;
const PASSWORD = 'correct-horse-battery';
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

async function createStaff(
  opts: { role?: string; password?: string | null; telegramId?: bigint } = {},
) {
  const p = phone();
  const [u] = await db
    .insert(users)
    .values({
      fullName: 'Xodim',
      phone: p,
      passwordHash: opts.password === null ? null : await hashPassword(opts.password ?? PASSWORD),
      telegramId: opts.telegramId ?? null,
    })
    .returning();
  const [r] = await db
    .select()
    .from(roles)
    .where(eq(roles.code, (opts.role ?? 'director') as 'director'));
  await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
  return { id: u!.id, phone: p };
}

/** Birinchi kirish: parol → TOTP sozlash → yoqish. */
async function enroll(p: string) {
  const login = await post('login', { phone: p, password: PASSWORD });
  const { mfaToken } = login.json<{ mfaToken: string }>();
  const { secret } = (await post('totp/setup', { mfaToken })).json<{ secret: string }>();
  const totpCode = TOTP.generate({ secret: Secret.fromBase32(secret), period: 30 });
  const enable = await post('totp/enable', { mfaToken, code: totpCode });
  return { login, enable, secret, totpCode };
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

describe('Login (T-006, FR-AUTH-3)', () => {
  it("noto'g'ri parol va noma'lum telefon — bir xil javob (enumeration yo'q)", async () => {
    const s = await createStaff();
    const wrong = await post('login', { phone: s.phone, password: 'wrong-password-1' });
    const unknown = await post('login', { phone: phone(), password: 'wrong-password-1' });
    expect([wrong.statusCode, unknown.statusCode]).toEqual([401, 401]);
    expect([code(wrong), code(unknown)]).toEqual(['INVALID_CREDENTIALS', 'INVALID_CREDENTIALS']);
  });

  it('birinchi kirish: TOTP majburiy sozlanadi → sessiya, cookie, 10 zaxira kod', async () => {
    const s = await createStaff();
    const { login, enable } = await enroll(s.phone);
    expect(login.json<{ next: string }>().next).toBe('totp_setup');
    expect(enable.statusCode).toBe(200);
    const body = enable.json<{
      accessToken: string;
      backupCodes: string[];
      user: { activeRole: string };
    }>();
    expect(body.backupCodes).toHaveLength(10);
    expect(body.user.activeRole).toBe('director');
    expect(cookieOf(enable)).toMatchObject({
      httpOnly: true,
      secure: true,
      sameSite: 'Strict',
      path: '/api/auth',
    });
    expect((await get('me', body.accessToken)).statusCode).toBe(200);
  });

  it('keyingi kirish: TOTP; ishlatilgan kod qayta ishlamaydi; zaxira kod — bir marta', async () => {
    const s = await createStaff();
    const { enable, totpCode } = await enroll(s.phone);
    const [backup] = enable.json<{ backupCodes: string[] }>().backupCodes;
    const login = await post('login', { phone: s.phone, password: PASSWORD });
    const { next, mfaToken } = login.json<{ next: string; mfaToken: string }>();
    expect(next).toBe('totp');
    expect(code(await post('totp/verify', { mfaToken, code: '000000' }))).toBe('INVALID_TOTP');
    expect(code(await post('totp/verify', { mfaToken, code: totpCode }))).toBe('INVALID_TOTP'); // replay
    expect((await post('totp/verify', { mfaToken, backupCode: backup })).statusCode).toBe(200);
    expect((await post('totp/verify', { mfaToken, backupCode: backup })).statusCode).toBe(401);
  });

  it("web roli yo'q xodim (ustoz) kira olmaydi; bloklangan — 403", async () => {
    const teacher = await createStaff({ role: 'teacher' });
    expect(code(await post('login', { phone: teacher.phone, password: PASSWORD }))).toBe(
      'INVALID_CREDENTIALS',
    );
    const blocked = await createStaff();
    await db.update(users).set({ status: 'blocked' }).where(eq(users.id, blocked.id));
    const res = await post('login', { phone: blocked.phone, password: PASSWORD });
    expect([res.statusCode, code(res)]).toEqual([403, 'ACCOUNT_BLOCKED']);
  });

  it('rate limit: 5 urinishdan keyin 429', async () => {
    const s = await createStaff();
    for (let i = 0; i < 5; i++)
      await post('login', { phone: s.phone, password: 'wrong-password-1' });
    const res = await post('login', { phone: s.phone, password: PASSWORD });
    expect([res.statusCode, code(res)]).toEqual([429, 'TOO_MANY_REQUESTS']);
  });
});

describe("Refresh rotatsiyasi va token o'g'irligi (FR-AUTH-4)", () => {
  it('rotatsiya: yangi cookie, eski access token bekor', async () => {
    const s = await createStaff();
    const { enable } = await enroll(s.phone);
    const oldAccess = enable.json<{ accessToken: string }>().accessToken;
    const r1 = await post('refresh', undefined, withCookie(cookieOf(enable)!.value));
    expect(r1.statusCode).toBe(200);
    expect(cookieOf(r1)!.value).not.toBe(cookieOf(enable)!.value);
    expect((await get('me', r1.json<{ accessToken: string }>().accessToken)).statusCode).toBe(200);
    expect((await get('me', oldAccess)).statusCode).toBe(401);
  });

  it("o'g'irlangan (eski) refresh qayta ishlatilsa — butun oila bekor, event + audit", async () => {
    const s = await createStaff();
    const { enable } = await enroll(s.phone);
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
    const { enable } = await enroll(s.phone);
    const rt = cookieOf(enable)!.value;
    expect((await post('logout', undefined, withCookie(rt))).statusCode).toBe(204);
    expect(code(await post('refresh', undefined, withCookie(rt)))).toBe('SESSION_EXPIRED');
  });
});

describe('Sessiyalar va darhol kuchga kirish (FR-AUTH-7, 02 §1)', () => {
  it("sessiyalar ro'yxati; barcha qurilmalardan chiqish", async () => {
    const s = await createStaff();
    const { enable } = await enroll(s.phone);
    const access = enable.json<{ accessToken: string }>().accessToken;
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
    const ta = (await enroll(a.phone)).enable.json<{ accessToken: string }>().accessToken;
    const tb = (await enroll(b.phone)).enable.json<{ accessToken: string }>().accessToken;
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

describe('Taklif havolasi (staff_invites)', () => {
  it("parol o'rnatadi → TOTP sozlash; bir martalik; muddati o'tgani ishlamaydi", async () => {
    const s = await createStaff({ password: null });
    const token = randomToken();
    const expired = randomToken();
    const day = 24 * 60 * 60 * 1000;
    await db.insert(staffInvites).values([
      { userId: s.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + day) },
      { userId: s.id, tokenHash: sha256(expired), expiresAt: new Date(Date.now() - 1000) },
    ]);
    const ok = await post('invite/accept', { token, password: PASSWORD });
    expect(ok.json<{ next: string }>().next).toBe('totp_setup');
    expect(code(await post('invite/accept', { token, password: PASSWORD }))).toBe('INVALID_INVITE');
    expect(code(await post('invite/accept', { token: expired, password: PASSWORD }))).toBe(
      'INVALID_INVITE',
    );
    expect((await post('login', { phone: s.phone, password: PASSWORD })).statusCode).toBe(200);
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
});

describe('Audit (FR-AUD-1)', () => {
  it("kirish va muvaffaqiyatsiz urinish yoziladi; parol/kod audit'ga tushmaydi", async () => {
    const actions = (await db.select({ a: auditLogs.action }).from(auditLogs)).map((r) => r.a);
    expect(actions).toEqual(
      expect.arrayContaining(['auth.login', 'auth.login_failed', 'auth.totp_enabled']),
    );
    const dump = JSON.stringify(await db.select().from(auditLogs));
    expect(dump).not.toContain(PASSWORD);
  });
});
