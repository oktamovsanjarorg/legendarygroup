import { Controller, Get, Module, Post } from '@nestjs/common';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES, type RoleCode } from '@lg/contracts';
import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  roles,
  seed,
  sessions,
  userRoles,
  users,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Audit } from '../../common/audit/audit.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { SessionsService, TokensService } from '../auth/index.js';

/** Har ruxsat uchun bittadan endpoint: GET /api/probe/<perm> — `@RequirePermission(perm)`. */
@Controller('probe')
class ProbeController {
  @Get('no-decorator')
  noDecorator() {
    return { ok: true };
  }

  @Post('audited')
  @Public()
  @Audit({ action: 'probe.create', entity: 'probe' })
  audited() {
    return { id: 'p1', token: 'must-not-leak', value: 42 };
  }
}
for (const p of PERMISSIONS) {
  const name = `perm_${p.replace('.', '_')}`;
  Object.defineProperty(ProbeController.prototype, name, {
    value: () => ({ ok: true }),
    writable: true,
  });
  const descriptor = Object.getOwnPropertyDescriptor(ProbeController.prototype, name)!;
  Get(p)(ProbeController.prototype, name, descriptor);
  RequirePermission(p)(ProbeController.prototype, name, descriptor);
}
@Module({ controllers: [ProbeController] })
class ProbeModule {}

let t: TestApp;
let db: Database;
const tokenFor = new Map<RoleCode, string>();
const userFor = new Map<RoleCode, string>();
let n = 0;

async function createUser(roleCodes: RoleCode[]): Promise<string> {
  n += 1;
  const [u] = await db
    .insert(users)
    .values({ fullName: `U${n}`, phone: `+99891${String(n).padStart(7, '0')}` })
    .returning();
  for (const code of roleCodes) {
    const [r] = await db.select().from(roles).where(eq(roles.code, code));
    await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
  }
  return u!.id;
}

/** Sessiya + access token (web login'siz — ustoz/ota-ona uchun ham). */
async function tokenOf(userId: string, role: RoleCode): Promise<string> {
  const s = await t.app.get(SessionsService).create(userId, role, { ip: null, device: 'test' });
  const [u] = await db
    .select({ pv: users.permissionsVersion })
    .from(users)
    .where(eq(users.id, userId));
  return t.app.get(TokensService).signAccess({ sub: userId, role, sid: s.sessionId, pv: u!.pv });
}

const call = (
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  token: string,
  payload?: object,
) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });

beforeAll(async () => {
  t = await createRealTestApp([ProbeModule]);
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  for (const role of ROLES) {
    const id = await createUser([role]);
    userFor.set(role, id);
    tokenFor.set(role, await tokenOf(id, role));
  }
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Avtomatik matritsa: har rol × har ruxsat (02 §4, T-008)', () => {
  it.each(ROLES)('%s: har ruxsat — kutilgan natija (200 yoki 403)', async (role) => {
    const results = await Promise.all(
      PERMISSIONS.map(
        async (p) =>
          [p, (await call('GET', `probe/${p}`, tokenFor.get(role)!)).statusCode] as const,
      ),
    );
    const expected = PERMISSIONS.map(
      (p) => [p, ROLE_PERMISSIONS[role].includes(p) ? 200 : 403] as const,
    );
    expect(results).toEqual(expected);
  });

  it("dekoratorsiz endpoint — hatto Director'ga ham 403 (deny by default)", async () => {
    expect((await call('GET', 'probe/no-decorator', tokenFor.get('director')!)).statusCode).toBe(
      403,
    );
  });
});

describe('Override va permissions_version (02 §1, §4)', () => {
  it("Director Admin'ga finance.view beradi → keyingi so'rovdan kuchga kiradi, eski token yaroqsiz", async () => {
    const admin = userFor.get('admin')!;
    const old = tokenFor.get('admin')!;
    expect((await call('GET', 'probe/finance.view', old)).statusCode).toBe(403);
    const res = await call(
      'PUT',
      `rbac/users/${admin}/overrides/finance.view`,
      tokenFor.get('director')!,
      { granted: true },
    );
    expect(res.statusCode).toBe(204);
    expect((await call('GET', 'probe/finance.view', old)).statusCode).toBe(401); // pv o'zgardi
    const fresh = await tokenOf(admin, 'admin');
    expect((await call('GET', 'probe/finance.view', fresh)).statusCode).toBe(200);
    tokenFor.set('admin', fresh);
  });

  it("delegatsiya qilinmaydigan ruxsat Admin'ga berilmaydi — 422 NON_DELEGABLE_PERMISSION", async () => {
    const res = await call(
      'PUT',
      `rbac/users/${userFor.get('admin')!}/overrides/audit.view`,
      tokenFor.get('director')!,
      { granted: true },
    );
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([
      422,
      'NON_DELEGABLE_PERMISSION',
    ]);
  });

  it("Admin ruxsat bera olmaydi (staff.permissions yo'q) — 403", async () => {
    const res = await call(
      'PUT',
      `rbac/users/${userFor.get('teacher')!}/overrides/group.view`,
      tokenFor.get('admin')!,
      { granted: false },
    );
    expect(res.statusCode).toBe(403);
  });
});

describe('Bloklash va oxirgi Director (02 §2)', () => {
  it("oxirgi faol Directorni bloklab bo'lmaydi — 409 LAST_DIRECTOR", async () => {
    const director = userFor.get('director')!;
    const res = await call('POST', `rbac/users/${director}/block`, tokenFor.get('director')!);
    expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([409, 'LAST_DIRECTOR']);
  });

  it('bloklash — barcha sessiyalar darhol bekor', async () => {
    const victim = await createUser(['admin']);
    const token = await tokenOf(victim, 'admin');
    expect((await call('GET', 'probe/course.manage', token)).statusCode).toBe(200);
    expect(
      (await call('POST', `rbac/users/${victim}/block`, tokenFor.get('director')!)).statusCode,
    ).toBe(204);
    expect((await call('GET', 'probe/course.manage', token)).statusCode).toBe(401);
    const active = await db.select().from(sessions).where(eq(sessions.userId, victim));
    expect(active.every((s) => s.revokedAt !== null)).toBe(true);
  });

  it("ikkinchi Director bo'lsa — rolini olish mumkin, keyin oxirgisi himoyalangan", async () => {
    const second = await createUser(['director']);
    const first = userFor.get('director')!;
    const d = tokenFor.get('director')!;
    expect((await call('DELETE', `rbac/users/${second}/roles/director`, d)).statusCode).toBe(204);
    expect((await call('DELETE', `rbac/users/${first}/roles/director`, d)).statusCode).toBe(409);
  });
});

describe('Faol rol (02 §1: ruxsatlar birlashtirilmaydi)', () => {
  it('rol almashtirish: yangi token, eski rolli token yaroqsiz; tayinlanmagan rol — 403', async () => {
    const both = await createUser(['director', 'admin']);
    const asDirector = await tokenOf(both, 'director');
    expect((await call('GET', 'probe/audit.view', asDirector)).statusCode).toBe(200);
    const sw = await call('POST', 'auth/role', asDirector, { role: 'admin' });
    expect(sw.statusCode).toBe(200);
    const asAdmin = sw.json<{ accessToken: string }>().accessToken;
    expect((await call('GET', 'probe/audit.view', asAdmin)).statusCode).toBe(403);
    expect((await call('GET', 'probe/audit.view', asDirector)).statusCode).toBe(401);
    expect((await call('POST', 'auth/role', asAdmin, { role: 'teacher' })).statusCode).toBe(403);
  });
});

describe('Audit interceptor (FR-AUD-1)', () => {
  it('@Audit: actor, entityId, after — sirlar yashirilgan', async () => {
    await t.app.inject({ method: 'POST', url: '/api/probe/audited' });
    const [row] = await db.select().from(auditLogs).where(eq(auditLogs.action, 'probe.create'));
    expect(row).toMatchObject({ entity: 'probe', entityId: 'p1' });
    expect(row?.after).toEqual({ id: 'p1', token: '[yashirilgan]', value: 42 });
  });

  it("RBAC o'zgarishlari audit'da before/after bilan", async () => {
    const rows = await db.select().from(auditLogs).where(eq(auditLogs.action, 'rbac.override_set'));
    expect(rows[0]).toMatchObject({
      before: { permission: 'finance.view', granted: null },
      after: { permission: 'finance.view', granted: true },
      actorRole: 'director',
    });
  });
});
