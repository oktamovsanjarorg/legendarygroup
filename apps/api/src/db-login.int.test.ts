import { closeDb, createDb, type Database } from '@lg/db';
import { createTempDb, type TempDb } from '@lg/db/testing';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ensureAppLogin, scramVerifier } from './db-login.js';

describe('ensureAppLogin (T-014: prod RDS ilova login’i)', () => {
  let temp: TempDb;
  let db: Database;
  const login = `lg_t_${process.pid}_${Math.floor(Math.random() * 1e6)}`;
  const connectAs = (password: string) => {
    const url = new URL(temp.url);
    url.username = login;
    url.password = password;
    return createDb(url.toString(), { max: 1 });
  };

  beforeAll(async () => {
    temp = await createTempDb();
    db = createDb(temp.url, { max: 1 });
  });
  afterAll(async () => {
    await db.execute(sql.raw(`DROP ROLE IF EXISTS "${login}"`)).catch(() => undefined);
    await closeDb(db);
    await temp.drop();
  });

  it('yaratadi, qayta chaqirilsa parolni yangilaydi; login lg_app a’zosi', async () => {
    const first = 'a'.repeat(32);
    const second = 'b'.repeat(32);
    await ensureAppLogin(db, login, first);
    const c1 = connectAs(first);
    const member = sql`SELECT pg_has_role(current_user, 'lg_app', 'MEMBER') AS m`;
    expect([...(await c1.execute(member))]).toEqual([{ m: true }]);
    await closeDb(c1);

    await ensureAppLogin(db, login, second);
    const stale = connectAs(first);
    await expect(stale.execute(sql`SELECT 1`)).rejects.toMatchObject({ cause: { code: '28P01' } });
    await closeDb(stale);
    const c2 = connectAs(second);
    expect([...(await c2.execute(sql`SELECT 1 AS n`))]).toEqual([{ n: 1 }]);
    await closeDb(c2);
  });

  it('xavfsiz bo‘lmagan nom/parol — rad etiladi', async () => {
    await expect(ensureAppLogin(db, 'Bad"; DROP', 'a'.repeat(32))).rejects.toThrow();
    await expect(
      ensureAppLogin(db, login, "x'; DROP ROLE x; --".padEnd(30, 'x')),
    ).rejects.toThrow();
    await expect(ensureAppLogin(db, login, 'short')).rejects.toThrow();
  });

  it('verifier — PostgreSQL SCRAM formati, ochiq parol ichida yo‘q', () => {
    const v = scramVerifier('c'.repeat(32), Buffer.alloc(16, 1));
    expect(v).toMatch(/^SCRAM-SHA-256\$4096:[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);
    expect(v).not.toContain('c'.repeat(8));
  });
});
