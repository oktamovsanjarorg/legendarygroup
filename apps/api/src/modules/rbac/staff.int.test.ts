import { type RoleCode, ROLES } from '@lg/contracts';
import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  guardianLinkRequests,
  roles,
  seed,
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
const BOT_URL = 'https://t.me/legendary_test_bot';

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
    ['POST', `staff/${someId}/telegram/unlink`],
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

describe('Admin qoʻshish — parolsiz (Q-98)', () => {
  it('yaratiladi, roʻyxatda "invited", javobda bot havolasi (token yoʻq)', async () => {
    const res = await call('POST', 'staff', director(), {
      phone: '+998931110001',
      fullName: 'Rahimova Gulnoza',
      role: 'admin',
    });
    expect(res.statusCode).toBe(201);
    const { id, botUrl } = res.json<{ id: string; botUrl: string }>();
    expect(botUrl).toBe(BOT_URL);
    const list = (await call('GET', 'staff', director())).json<{ id: string; status: string }[]>();
    expect(list.find((s) => s.id === id)?.status).toBe('invited');
    const [u] = await db.select({ ph: users.passwordHash }).from(users).where(eq(users.id, id));
    expect(u?.ph).toBeNull();
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

describe('Ustoz qoʻshish — bot havolasi va kontakt orqali bogʻlash', () => {
  let id = '';
  it('javobda bot havolasi; tafsilotda ham (ulanguncha)', async () => {
    const res = await call('POST', 'staff', director(), {
      phone: '+998932220002',
      fullName: 'Karimov Rustam',
      role: 'teacher',
    });
    const body = res.json<{ id: string; botUrl: string }>();
    id = body.id;
    expect(body.botUrl).toBe(BOT_URL);
    const detail = (await call('GET', `staff/${id}`, director())).json<{ botUrl: string }>();
    expect(detail.botUrl).toBe(BOT_URL);
  });

  it("Q-98: boshqa raqam — bog'lanmaydi; o'z raqami (+ siz) — taklifsiz bog'lanadi", async () => {
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
    const detail = (await call('GET', `staff/${id}`, director())).json<{
      status: string;
      telegramLinked: boolean;
    }>();
    expect(detail).toMatchObject({ status: 'active', telegramLinked: true, botUrl: null });
  });

  it("bog'langan raqamni boshqa Telegram egallay olmaydi", async () => {
    expect(
      (await internal('contact', { telegramId: '7999', phone: '+998932220002' })).json(),
    ).toEqual({ result: 'conflict' });
  });

  it("Q-98: Admin ham faqat raqam bilan; ota-ona va bloklangan xodim — bog'lanmaydi", async () => {
    const [a, g, b] = [phone(), phone(), phone()];
    await createUser(['admin'], a);
    await createUser(['guardian'], g);
    const blocked = await createUser(['teacher'], b);
    await db.update(users).set({ status: 'blocked' }).where(eq(users.id, blocked));
    const share = async (telegramId: string, p: string) =>
      (await internal('contact', { telegramId, phone: p })).json<{ result: string }>().result;
    expect(await share('7101', a)).toBe('staff_linked');
    expect(await share('7102', g)).toBe('not_found');
    expect(await share('7103', b)).toBe('not_found');
  });

  it("Q-98: Telegram boshqa foydalanuvchida band — conflict, yozuv o'zgarmaydi", async () => {
    const p = phone();
    const other = await createUser(['teacher'], p);
    expect((await internal('contact', { telegramId: '7001', phone: p })).json()).toEqual({
      result: 'conflict',
    });
    const [u] = await db.select({ tg: users.telegramId }).from(users).where(eq(users.id, other));
    expect(u?.tg).toBeNull();
  });

  it("Q-98: Telegram'ni uzish — sessiyalar yopiladi, yangi Telegram'dan qayta ulanadi; audit", async () => {
    const token = await tokenOf(id, 'teacher');
    const url = `staff/${id}/telegram/unlink`;
    expect((await call('POST', url, director())).statusCode).toBe(204);
    expect((await call('GET', 'teachers', token)).statusCode).toBe(401);
    expect((await call('POST', url, director())).json<{ code: string }>().code).toBe(
      'STAFF_TELEGRAM_NOT_LINKED',
    );
    expect(
      (await internal('contact', { telegramId: '7999', phone: '+998932220002' })).json(),
    ).toMatchObject({ result: 'staff_linked' });
    const log = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'staff.telegram_unlinked'));
    expect(log.map((l) => l.entityId)).toEqual([id]);
  });

  it("Q-98: xodim bo'lmagan (ota-ona) — uzib bo'lmaydi (404)", async () => {
    const g = await createUser(['guardian']);
    expect((await call('POST', `staff/${g}/telegram/unlink`, director())).statusCode).toBe(404);
  });
});

describe('Mavjud foydalanuvchi, blokdan chiqarish', () => {
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

describe('Q-98: Direktor ham botda raqam ulashib ulanadi', () => {
  it('avvalgi ota-ona soʻrovi yopiladi', async () => {
    const p = phone();
    await createUser(['director'], p);
    // Raqam hali tanilmagan paytda bot ota-ona so'rovi yaratgan (prod'dagi holat).
    await db
      .insert(guardianLinkRequests)
      .values({ telegramId: 7900n, phone: p, fullName: 'Direktor' });
    const linked = await internal('contact', { telegramId: '7900', phone: p.replace('+', '') });
    expect(linked.json()).toMatchObject({ result: 'staff_linked' });
    const [req] = await db
      .select()
      .from(guardianLinkRequests)
      .where(eq(guardianLinkRequests.telegramId, 7900n));
    expect(req?.status).toBe('rejected');
  });
});
