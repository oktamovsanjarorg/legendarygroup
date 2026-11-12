import { type RoleCode, ROLES } from '@lg/contracts';
import { type Database, roles, userRoles, users } from '@lg/db';
import { eq } from 'drizzle-orm';
import { SessionsService, TokensService } from '../modules/auth/index.js';
import type { TestApp } from './test-app.js';

let n = 0;

/** Rolli foydalanuvchi yaratish (`seed()` oldin chaqirilgan bo'lishi kerak — rollar jadvali). */
export async function createUserWithRole(
  db: Database,
  role: RoleCode,
  phone = `+99897${String((n += 1)).padStart(7, '0')}`,
): Promise<string> {
  const [u] = await db
    .insert(users)
    .values({ fullName: `Test ${role} ${phone.slice(-4)}`, phone })
    .returning();
  const [r] = await db.select().from(roles).where(eq(roles.code, role));
  if (!u || !r) throw new Error('test foydalanuvchisi yaratilmadi');
  await db.insert(userRoles).values({ userId: u.id, roleId: r.id });
  return u.id;
}

/** Mavjud foydalanuvchi uchun access token (sessiya bilan). */
export async function tokenFor(
  t: TestApp,
  db: Database,
  userId: string,
  role: RoleCode,
): Promise<string> {
  const [u] = await db
    .select({ pv: users.permissionsVersion })
    .from(users)
    .where(eq(users.id, userId));
  if (!u) throw new Error('foydalanuvchi yoʻq');
  const s = await t.app.get(SessionsService).create(userId, role, { ip: null, device: 'test' });
  return t.app.get(TokensService).signAccess({ sub: userId, role, sid: s.sessionId, pv: u.pv });
}

/** Har rol uchun alohida foydalanuvchi + access token (integratsiya testlari uchun). */
export async function tokensForAllRoles(t: TestApp, db: Database): Promise<Map<RoleCode, string>> {
  const out = new Map<RoleCode, string>();
  for (const role of ROLES)
    out.set(role, await tokenFor(t, db, await createUserWithRole(db, role), role));
  return out;
}
