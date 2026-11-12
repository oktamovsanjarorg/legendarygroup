import { type RoleCode, ROLES } from '@lg/contracts';
import { type Database, roles, userRoles, users } from '@lg/db';
import { eq } from 'drizzle-orm';
import { SessionsService, TokensService } from '../modules/auth/index.js';
import type { TestApp } from './test-app.js';

let n = 0;

/**
 * Har rol uchun alohida foydalanuvchi + access token (integratsiya testlari uchun).
 * `seed()` oldin chaqirilgan bo'lishi kerak (rollar jadvali).
 */
export async function tokensForAllRoles(t: TestApp, db: Database): Promise<Map<RoleCode, string>> {
  const out = new Map<RoleCode, string>();
  for (const role of ROLES) {
    n += 1;
    const [u] = await db
      .insert(users)
      .values({ fullName: `Test ${role} ${n}`, phone: `+99897${String(n).padStart(7, '0')}` })
      .returning();
    const [r] = await db.select().from(roles).where(eq(roles.code, role));
    if (!u || !r) throw new Error('test foydalanuvchisi yaratilmadi');
    await db.insert(userRoles).values({ userId: u.id, roleId: r.id });
    const s = await t.app.get(SessionsService).create(u.id, role, { ip: null, device: 'test' });
    out.set(
      role,
      await t.app
        .get(TokensService)
        .signAccess({ sub: u.id, role, sid: s.sessionId, pv: u.permissionsVersion }),
    );
  }
  return out;
}
