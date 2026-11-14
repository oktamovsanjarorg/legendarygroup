import { ROLE_PERMISSIONS, ROLES } from '@lg/contracts';
import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { closeDb, createDb, type Database } from './client.js';
import { loadRootEnv, requireDatabaseUrl } from './env.js';
import { runMigrations } from './migrate.js';
import { auditLogs, rolePermissions, users } from './schema/index.js';
import { seed } from './seed.js';

loadRootEnv();
const adminUrl = requireDatabaseUrl();
const dbName = `lg_int_${process.pid}_${Date.now()}`;
const testUrl = (() => {
  const u = new URL(adminUrl);
  u.pathname = `/${dbName}`;
  return u.toString();
})();

const admin = postgres(adminUrl, { max: 1, onnotice: () => undefined });
let db: Database;
/** Drizzle asl Postgres xatosini `cause`ga o'raydi. */
const IMMUTABLE = { cause: { message: expect.stringMatching(/o'zgarmas/) } };

beforeAll(async () => {
  await admin.unsafe(`CREATE DATABASE "${dbName}"`);
  await runMigrations(testUrl);
  await runMigrations(testUrl); // idempotent
  await seed(testUrl, { withTestDirector: true });
  await seed(testUrl, { withTestDirector: true }); // idempotent
  db = createDb(testUrl, { max: 2 });
});

afterAll(async () => {
  if (db) await closeDb(db);
  await admin.unsafe(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
  await admin.end();
});

describe('seed', () => {
  it('rol-ruxsat matritsasini aynan yozadi (qayta ishga tushirishda takrorlanmaydi)', async () => {
    const rows = await db.query.roles.findMany({ with: { rolePermissions: true } });
    expect(rows.map((r) => r.code).sort()).toEqual([...ROLES].sort());
    for (const r of rows) {
      expect(r.rolePermissions.map((p) => p.permissionCode).sort()).toEqual(
        [...ROLE_PERMISSIONS[r.code]].sort(),
      );
    }
  });

  it('test Director bitta va director rolida', async () => {
    const list = await db.query.users.findMany({ with: { userRoles: { with: { role: true } } } });
    expect(list).toHaveLength(1);
    expect(list[0]?.userRoles.map((ur) => ur.role.code)).toEqual(['director']);
  });

  it("matritsadan chiqarilgan ruxsat keyingi seed'da roldan olib tashlanadi", async () => {
    const teacher = await db.query.roles.findFirst({ where: (r, { eq }) => eq(r.code, 'teacher') });
    await db.insert(rolePermissions).values({ roleId: teacher!.id, permissionCode: 'audit.view' });
    await seed(testUrl, { withTestDirector: false });
    const perms = await db.query.rolePermissions.findMany({
      where: (rp, { eq }) => eq(rp.roleId, teacher!.id),
    });
    expect(perms.map((p) => p.permissionCode)).not.toContain('audit.view');
  });
});

describe('users cheklovlari', () => {
  it("E.164 bo'lmagan telefon rad etiladi", async () => {
    await expect(db.insert(users).values({ fullName: 'X', phone: '901234567' })).rejects.toThrow();
  });
});

describe('audit_logs — faqat INSERT', () => {
  it('INSERT ishlaydi, UPDATE/DELETE/TRUNCATE trigger bilan bloklanadi', async () => {
    const [row] = await db.insert(auditLogs).values({ action: 'test', entity: 'test' }).returning();
    expect(row).toBeDefined();
    await expect(db.execute(sql`UPDATE audit_logs SET action = 'x'`)).rejects.toMatchObject(
      IMMUTABLE,
    );
    await expect(db.execute(sql`DELETE FROM audit_logs`)).rejects.toMatchObject(IMMUTABLE);
    await expect(db.execute(sql`TRUNCATE audit_logs`)).rejects.toMatchObject(IMMUTABLE);
  });

  it("lg_app rolida UPDATE/DELETE grant yo'q, INSERT/SELECT bor", async () => {
    const [p] = await db.execute<Record<string, boolean>>(sql`
      SELECT has_table_privilege('lg_app', 'audit_logs', 'INSERT') AS ins,
             has_table_privilege('lg_app', 'audit_logs', 'SELECT') AS sel,
             has_table_privilege('lg_app', 'audit_logs', 'UPDATE') AS upd,
             has_table_privilege('lg_app', 'audit_logs', 'DELETE') AS del,
             has_table_privilege('lg_app', 'users', 'UPDATE') AS users_upd`);
    expect(p).toEqual({ ins: true, sel: true, upd: false, del: false, users_upd: true });
  });

  it("audit tarixi bor foydalanuvchini qattiq o'chirib bo'lmaydi", async () => {
    const [u] = await db
      .insert(users)
      .values({ fullName: 'A', phone: '+998900000099' })
      .returning();
    await db.insert(auditLogs).values({ actorId: u!.id, action: 'test', entity: 'test' });
    await expect(db.execute(sql`DELETE FROM users WHERE id = ${u!.id}`)).rejects.toThrow();
  });
});
