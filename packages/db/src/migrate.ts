import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { closeDb, createDb } from './client.js';
import { isMain, loadRootEnv, maskUrl, requireDatabaseUrl } from './env.js';

export const MIGRATIONS_FOLDER = fileURLToPath(new URL('../drizzle', import.meta.url));

/** Migratsiyalarni qo'llaydi. Qayta ishga tushirish xavfsiz (qo'llanganlari o'tkazib yuboriladi). */
export async function runMigrations(url: string): Promise<void> {
  const db = createDb(url, { max: 1, appName: 'lg-migrate' });
  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  } finally {
    await closeDb(db);
  }
}

if (isMain(import.meta.url)) {
  loadRootEnv();
  const url = requireDatabaseUrl();
  console.info(`[db:migrate] ${maskUrl(url)}`);
  runMigrations(url).then(
    () => console.info('[db:migrate] tayyor'),
    (err: unknown) => {
      console.error('[db:migrate] xato:', err);
      process.exitCode = 1;
    },
  );
}
