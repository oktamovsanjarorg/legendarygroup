import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema/index.js';

export type Schema = typeof schema;
export type Database = PostgresJsDatabase<Schema> & { $client: postgres.Sql };
/** `db.transaction(async (tx) => ...)` ichidagi `tx` tipi. */
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export interface DbOptions {
  /** Pul ulanishlari soni (API: 10, worker: 5, CLI: 1). */
  max?: number;
  /** Ulanish nomi — `pg_stat_activity`da ko'rinadi. */
  appName?: string;
}

/**
 * Ulanish yaratadi. Global singleton yo'q: har ilova (api/worker/bot) o'z
 * ulanishini DI orqali boshqaradi va yopilishda `closeDb` chaqiradi.
 */
export function createDb(url: string, opts: DbOptions = {}): Database {
  const client = postgres(url, {
    max: opts.max ?? 10,
    idle_timeout: 20,
    connect_timeout: 10,
    connection: { application_name: opts.appName ?? 'lg', TimeZone: 'UTC' },
    onnotice: () => undefined,
  });
  return drizzle(client, { schema });
}

export const closeDb = (db: Database): Promise<void> => db.$client.end({ timeout: 5 });
