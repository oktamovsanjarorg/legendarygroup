import { requireDatabaseUrl } from './env.js';
import { runMigrations } from './migrate.js';
import postgres from 'postgres';

export interface TempDb {
  url: string;
  drop: () => Promise<void>;
}

/**
 * Har integratsiya test fayli uchun alohida, migratsiya qilingan vaqtinchalik baza
 * (07-quality-security.md §1). Dev bazaga hech narsa yozilmaydi.
 * Server manzili `DATABASE_URL`dan (lokal — compose.dev, CI — service container).
 * `prefix` — e2e (`lg_e2e`) bazalarini ajratish va qolib ketganlarini tozalash uchun.
 */
export async function createTempDb(prefix = 'lg_int'): Promise<TempDb> {
  const adminUrl = requireDatabaseUrl();
  const name = `${prefix}_${process.pid}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = postgres(adminUrl, { max: 1, onnotice: () => undefined });
  await admin.unsafe(`CREATE DATABASE "${name}"`);

  const url = new URL(adminUrl);
  url.pathname = `/${name}`;
  await runMigrations(url.toString());

  return {
    url: url.toString(),
    drop: async () => {
      await admin.unsafe(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
      await admin.end();
    },
  };
}

/** `prefix_` bilan boshlanuvchi qolib ketgan bazalarni o'chiradi (oldingi yiqilgan e2e ishga tushirishlari). */
export async function dropStaleTempDbs(prefix: string): Promise<number> {
  const admin = postgres(requireDatabaseUrl(), { max: 1, onnotice: () => undefined });
  try {
    const rows = await admin<{ datname: string }[]>`
      SELECT datname FROM pg_database WHERE starts_with(datname, ${`${prefix}_`})`;
    for (const r of rows) await admin.unsafe(`DROP DATABASE IF EXISTS "${r.datname}" WITH (FORCE)`);
    return rows.length;
  } finally {
    await admin.end();
  }
}
