import { type RoleCode, ROLES } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  roles,
  seed,
  staffInvites,
  userRoles,
  users,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { INTERNAL_TOKEN_HEADER } from '../../common/guards/internal-token.guard.js';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { SessionsService, TokensService } from '../auth/index.js';

let t: TestApp;
let db: Database;
const tokenFor = new Map<RoleCode, string>();
let n = 0;
const phone = () => `+99893${String((n += 1)).padStart(7, '0')}`;

async function createUser(codes: RoleCode[], p = phone()): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({ fullName: `Foydalanuvchi ${n}`, phone: p })
    .returning();
  for (const code of codes) {
    const [r] = await db.select().from(roles).where(eq(roles.code, code));
    await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
  }
  return u!.id;
}

async function tokenOf(userId: string, role: RoleCode): Promise<string> {
  const s = await t.app.get(SessionsService).create(userId, role, { ip: null, device: 'test' });
  const [u] = await db
    .select({ pv: users.permissionsVersion })
    .from(users)
    .where(eq(users.id, userId));
  return t.app.get(TokensService).signAccess({ sub: userId, role, sid: s.sessionId, pv: u!.pv });
}

const call = (method: 'GET' | 'POST', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });
const internal = (url: string, payload: object, token: string = TEST_ENV.INTERNAL_API_TOKEN) =>
  t.app.inject({
    method: 'POST',
    url: `/internal/staff/${url}`,
    payload,
    headers: { [INTERNAL_TOKEN_HEADER]: token },
  });
const director = () => tokenFor.get('director')!;
const tokenFromUrl = (url: string) => url.split(/\/invite\/|start=inv_/)[1]!;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  for (const role of ROLES) tokenFor.set(role, await tokenOf(await createUser([role]), role));
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Ruxsat: faqat staff.manage (Director) — har endpoint uchun forbidden (CLAUDE.md)', () => {
  const someId = '00000000-0000-4000-8000-000000000000';
  const endpoints: [method: 'GET' | 'POST', url: string, body?: object][] = [
    ['GET', 'staff'],
    ['GET', `staff/${someId}`],
    ['POST', 'staff', { phone: '+998930000999', fullName: 'Ali Valiyev', role: 'teacher' }],
    ['POST', `staff/${someId}/invite`],
    ['POST', `staff/${someId}/unblock`],
    ['POST', `staff/${someId}/roles`, { role: 'admin' }],
  ];
  it.each(['admin', 'teacher', 'guardian'] as const)('%s → 403', async (role) => {
    for (const [method, url, body] of endpoints)
      expect(
        (await call(method, url, tokenFor.get(role)!, body)).statusCode,
        `${method} ${url}`,
      ).toBe(403);
  });
  it('internal: token yoʻq yoki notoʻgʻri → 401', async () => {
    expect(
      (await internal('contact', { telegramId: '1', phone: '+998' }, 'wrong')).statusCode,
    ).toBe(401);
  });
});

describe('Admin qoʻshish — web taklif (parol + TOTP)', () => {
  it('yaratiladi, roʻyxatda "invited", taklif /invite/<token> — qabul qilinadi', async () => {
    const res = await call('POST', 'staff', director(), {
      phone: '+998931110001',
      fullName: 'Rahimova Gulnoza',
      role: 'admin',
    });
    expect(res.statusCode).toBe(201);
    const { id, invite } = res.json<{ id: string; invite: { channel: string; url: string } }>();
    expect(invite.channel).toBe('web');
    expect(invite.url).toMatch(/^https:\/\/app\.test\.lg\/invite\/[A-Za-z0-9_-]{43}$/);
    const list = (await call('GET', 'staff', director())).json<{ id: string; status: string }[]>();
    expect(list.find((s) => s.id === id)?.status).toBe('invited');
    const accept = await t.app.inject({
      method: 'POST',
      url: '/api/auth/invite/accept',
      payload: { token: tokenFromUrl(invite.url), password: 'juda-uzun-parol-123' },
    });
    expect(accept.statusCode).toBe(200);
  });

  it('shu rol takror — ALREADY_STAFF (409)', async () => {
    const res = await call('POST', 'staff', director(), {
      phone: '+998931110001',
      fullName: 'Takror',
      role: 'admin',
    });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ code: string }>().code).toBe('ALREADY_STAFF');
  });
});

describe('Ustoz qoʻshish — bot taklifi va kontakt orqali bogʻlash', () => {
  let id = '';
  let token = '';
  it('bot havolasi (t.me/<bot>?start=inv_<token>), tekshiruv — ism bilan', async () => {
    const res = await call('POST', 'staff', director(), {
      phone: '+998932220002',
      fullName: 'Karimov Rustam',
      role: 'teacher',
    });
    const body = res.json<{ id: string; invite: { channel: string; url: string } }>();
    id = body.id;
    expect(body.invite.url).toMatch(
      /^https:\/\/t\.me\/legendary_test_bot\?start=inv_[A-Za-z0-9_-]{43}$/,
    );
    expect(`inv_${tokenFromUrl(body.invite.url)}`.length).toBeLessThanOrEqual(64);
    token = tokenFromUrl(body.invite.url);
    expect((await internal('invite/check', { token })).json()).toEqual({
      valid: true,
      fullName: 'Karimov Rustam',
    });
  });

  it("REGRESSIYA: bot tokeni bilan web parol o'rnatib bo'lmaydi — taklif yonmaydi, parol yozilmaydi", async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/auth/invite/accept',
      payload: { token, password: 'juda-uzun-parol-123' },
    });
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
    const [u] = await db.select({ ph: users.passwordHash }).from(users).where(eq(users.id, id));
    expect(u?.ph).toBeNull();
    expect((await internal('invite/check', { token })).json()).toMatchObject({ valid: true });
  });

  it("boshqa raqam — bog'lanmaydi; o'z raqami (+ siz) — bog'lanadi, taklif ishlatiladi", async () => {
    expect(
      (await internal('contact', { telegramId: '7001', phone: '998939999999' })).json(),
    ).toEqual({ result: 'not_found' });
    expect(
      (
        await internal('contact', {
          telegramId: '7001',
          phone: '998932220002',
          username: 'rustam_k',
        })
      ).json(),
    ).toEqual({
      result: 'staff_linked',
      fullName: 'Karimov Rustam',
    });
    expect(
      (await internal('contact', { telegramId: '7001', phone: '998932220002' })).json(),
    ).toMatchObject({ result: 'already_linked' });
    expect((await internal('invite/check', { token })).json()).toEqual({ valid: false });
    const detail = (await call('GET', `staff/${id}`, director())).json<{
      status: string;
      telegramLinked: boolean;
    }>();
    expect(detail).toMatchObject({ status: 'active', telegramLinked: true });
  });

  it("bog'langan raqamni boshqa Telegram egallay olmaydi", async () => {
    expect(
      (await internal('contact', { telegramId: '7999', phone: '+998932220002' })).json(),
    ).toEqual({ result: 'not_found' });
  });

  it("taklif kerak emas (bog'langan) — INVITE_NOT_NEEDED", async () => {
    const res = await call('POST', `staff/${id}/invite`, director());
    expect(res.json<{ code: string }>().code).toBe('INVITE_NOT_NEEDED');
  });
});

describe('Qayta taklif, mavjud foydalanuvchi, blokdan chiqarish', () => {
  it('qayta taklif — eski havola darhol yaroqsiz', async () => {
    const created = await call('POST', 'staff', director(), {
      phone: '+998933330003',
      fullName: 'Saidova Lola',
      role: 'teacher',
    });
    const { id, invite } = created.json<{ id: string; invite: { url: string } }>();
    const again = (await call('POST', `staff/${id}/invite`, director())).json<{ url: string }>();
    expect((await internal('invite/check', { token: tokenFromUrl(invite.url) })).json()).toEqual({
      valid: false,
    });
    expect(
      (await internal('invite/check', { token: tokenFromUrl(again.url) })).json(),
    ).toMatchObject({ valid: true });
    expect(await db.select().from(staffInvites).where(eq(staffInvites.userId, id))).toHaveLength(2);
  });

  it("ota-ona ham ustoz bo'ladi (FR-AUTH-5): mavjud foydalanuvchiga rol qo'shiladi", async () => {
    const p = phone();
    const guardianId = await createUser(['guardian'], p);
    const res = await call('POST', 'staff', director(), {
      phone: p,
      fullName: 'E’tiborsiz',
      role: 'teacher',
    });
    expect(res.json<{ id: string }>().id).toBe(guardianId);
    const detail = (await call('GET', `staff/${guardianId}`, director())).json<{
      roles: string[];
    }>();
    expect(detail.roles.sort()).toEqual(['guardian', 'teacher']);
  });

  it('bloklash → blokdan chiqarish; bloklanmaganni chiqarish — NOT_BLOCKED', async () => {
    const id = await createUser(['admin']);
    expect((await call('POST', `rbac/users/${id}/block`, director())).statusCode).toBe(204);
    expect(
      (await call('POST', `staff/${id}/invite`, director())).json<{ code: string }>().code,
    ).toBe('USER_BLOCKED');
    expect((await call('POST', `staff/${id}/unblock`, director())).statusCode).toBe(204);
    expect(
      (await call('POST', `staff/${id}/unblock`, director())).json<{ code: string }>().code,
    ).toBe('NOT_BLOCKED');
  });
});

describe('Ustozlar katalogi (GET /teachers, group.view) — guruh/dars formalari uchun', () => {
  it('faqat faol ustozlar, faqat ism; bloklangan chiqmaydi; ota-ona — 403', async () => {
    const active = await createUser(['teacher']);
    const blocked = await createUser(['teacher']);
    await db.update(users).set({ status: 'blocked' }).where(eq(users.id, blocked));
    const res = await call('GET', 'teachers', tokenFor.get('admin')!);
    expect(res.statusCode).toBe(200);
    const list = res.json<Record<string, string>[]>();
    expect(list.map((x) => x['id'])).toContain(active);
    expect(list.map((x) => x['id'])).not.toContain(blocked);
    expect(Object.keys(list[0]!).sort()).toEqual(['fullName', 'id']);
    expect((await call('GET', 'teachers', tokenFor.get('guardian')!)).statusCode).toBe(403);
  });
});
