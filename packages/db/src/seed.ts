import { createHash, randomBytes } from 'node:crypto';
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from '@lg/contracts';
import { and, eq, notInArray, sql } from 'drizzle-orm';
import { closeDb, createDb, type Transaction } from './client.js';
import { isMain, loadRootEnv, maskUrl, requireDatabaseUrl } from './env.js';
import {
  permissions,
  rolePermissions,
  roles,
  staffInvites,
  userRoles,
  users,
} from './schema/index.js';
import { PERMISSION_DESCRIPTIONS, ROLE_NAMES, TEST_DIRECTOR } from './seed-data.js';

export interface SeedOptions {
  /** Test Director yaratilsinmi (productionda hech qachon). */
  withTestDirector: boolean;
}

/**
 * Rollar va ruxsatlar katalogini `@lg/contracts` bilan sinxronlaydi.
 * Idempotent: qayta ishga tushirish natijani o'zgartirmaydi; matritsadan
 * olib tashlangan ruxsat rolda ham o'chiriladi.
 */
async function syncCatalog(tx: Transaction): Promise<Map<string, string>> {
  await tx
    .insert(permissions)
    .values(PERMISSIONS.map((code) => ({ code, description: PERMISSION_DESCRIPTIONS[code] })))
    .onConflictDoUpdate({
      target: permissions.code,
      set: { description: sql`excluded.description` },
    });

  const roleRows = await tx
    .insert(roles)
    .values(ROLES.map((code) => ({ code, name: ROLE_NAMES[code] })))
    .onConflictDoUpdate({ target: roles.code, set: { name: sql`excluded.name` } })
    .returning({ id: roles.id, code: roles.code });
  const roleIds = new Map(roleRows.map((r) => [r.code, r.id]));

  for (const role of ROLES) {
    const roleId = roleIds.get(role);
    if (!roleId) throw new Error(`Rol topilmadi: ${role}`);
    const perms = ROLE_PERMISSIONS[role];
    await tx
      .delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, roleId),
          notInArray(rolePermissions.permissionCode, [...perms]),
        ),
      );
    await tx
      .insert(rolePermissions)
      .values(perms.map((permissionCode) => ({ roleId, permissionCode })))
      .onConflictDoNothing();
  }
  return roleIds;
}

/**
 * Test Direktor (faqat local/staging). Paroli yo'q bo'lsa — 24 soatlik taklif havolasi
 * qaytariladi (parol + TOTP o'rnatish, ADR 0006): lokal muhitda darhol kirish mumkin.
 */
async function ensureTestDirector(tx: Transaction, directorRoleId: string): Promise<string | null> {
  const [user] = await tx
    .insert(users)
    .values(TEST_DIRECTOR)
    .onConflictDoUpdate({ target: users.phone, set: { fullName: TEST_DIRECTOR.fullName } })
    .returning({ id: users.id, passwordHash: users.passwordHash });
  if (!user) throw new Error('Test Director yaratilmadi');
  await tx
    .insert(userRoles)
    .values({ userId: user.id, roleId: directorRoleId })
    .onConflictDoNothing();
  if (user.passwordHash) return null;
  const token = randomBytes(32).toString('base64url');
  await tx.insert(staffInvites).values({
    userId: user.id,
    tokenHash: createHash('sha256').update(token).digest('hex'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });
  return token;
}

/** Qaytaradi: test Direktor taklif tokeni (yaratilgan bo'lsa). */
export async function seed(url: string, opts: SeedOptions): Promise<string | null> {
  const db = createDb(url, { max: 1, appName: 'lg-seed' });
  try {
    return await db.transaction(async (tx) => {
      const roleIds = await syncCatalog(tx);
      const directorId = roleIds.get('director');
      return opts.withTestDirector && directorId ? ensureTestDirector(tx, directorId) : null;
    });
  } finally {
    await closeDb(db);
  }
}

if (isMain(import.meta.url)) {
  loadRootEnv();
  const url = requireDatabaseUrl();
  const withTestDirector = process.env['NODE_ENV'] !== 'production';
  console.info(`[db:seed] ${maskUrl(url)} (test director: ${withTestDirector ? 'ha' : 'yoʻq'})`);
  seed(url, { withTestDirector }).then(
    (invite) => {
      if (invite) {
        const base = process.env['PUBLIC_APP_URL'] ?? '';
        console.info(`[db:seed] Test Direktor (${TEST_DIRECTOR.phone}) sozlash havolasi, 24 soat:`);
        console.info(`  ${base}/invite/${invite}`);
      }
      console.info('[db:seed] tayyor');
    },
    (err: unknown) => {
      console.error('[db:seed] xato:', err);
      process.exitCode = 1;
    },
  );
}
