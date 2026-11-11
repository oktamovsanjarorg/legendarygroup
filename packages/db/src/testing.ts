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
 */
export async function createTempDb(): Promise<TempDb> {
  const adminUrl = requireDatabaseUrl();
  const name = `lg_int_${process.pid}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
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
