import { createHash, createHmac, pbkdf2Sync, randomBytes } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Database } from '@lg/db';

/** Login nomi — SQL identifikator sifatida xavfsiz (faqat kichik harf/raqam/_). */
export const SAFE_ROLE = /^[a-z_][a-z0-9_]{0,62}$/;
/** Parol — generatsiya qilingan (`openssl rand -hex`), SQL literalga xavfsiz belgilar. */
const SAFE_PASSWORD = /^[A-Za-z0-9_-]{24,128}$/;
const SCRAM_ITERATIONS = 4096;

/**
 * PostgreSQL SCRAM-SHA-256 verifier'i (RFC 5802/7677, `pg_authid.rolpassword` formati).
 * Parol serverga ochiq matnda bormaydi — DDL `log_statement` yoqilgan bo'lsa ham logda sir yo'q.
 */
export function scramVerifier(password: string, salt: Buffer = randomBytes(16)): string {
  const salted = pbkdf2Sync(password, salt, SCRAM_ITERATIONS, 32, 'sha256');
  const clientKey = createHmac('sha256', salted).update('Client Key').digest();
  const storedKey = createHash('sha256').update(clientKey).digest();
  const serverKey = createHmac('sha256', salted).update('Server Key').digest();
  const b64 = (b: Buffer) => b.toString('base64');
  return `SCRAM-SHA-256$${SCRAM_ITERATIONS}:${b64(salt)}$${b64(storedKey)}:${b64(serverKey)}`;
}

/**
 * Ilova login'i: yo'q bo'lsa yaratadi, bor bo'lsa parolini yangilaydi (sirlar manbai — SSM,
 * har deploy'da bir xil holatga keltiriladi). Keyin `lg_app` guruh roli beriladi. Idempotent.
 * Prod (RDS) — login'ni boshqa hech kim yaratmaydi; staging'da init skript ham yaratadi.
 */
export async function ensureAppLogin(db: Database, login: string, password: string): Promise<void> {
  if (!SAFE_ROLE.test(login)) throw new Error("APP_DB_LOGIN noto'g'ri (masalan lg_api)");
  if (!SAFE_PASSWORD.test(password))
    throw new Error("APP_DB_PASSWORD noto'g'ri: 24–128 belgi, faqat A-Z a-z 0-9 _ -");
  const verifier = scramVerifier(password);
  const exists = await db.execute<{ n: number }>(
    sql`SELECT 1 AS n FROM pg_roles WHERE rolname = ${login}`,
  );
  const verb = exists.length > 0 ? 'ALTER' : 'CREATE';
  await db.execute(sql.raw(`${verb} ROLE "${login}" LOGIN PASSWORD '${verifier}'`));
  await db.execute(sql.raw(`GRANT lg_app TO "${login}"`));
}
