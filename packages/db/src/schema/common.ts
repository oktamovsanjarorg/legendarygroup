import { sql, type SQL } from 'drizzle-orm';
import { timestamp, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

/** UUIDv7 PK — vaqt bo'yicha tartiblangan, B-tree indeksga qulay. */
export const primaryUuid = (name = 'id') =>
  uuid(name)
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** `timestamptz`; qiymat DB vaqti (UTC) bilan saqlanadi, ko'rsatishda Asia/Tashkent. */
export const tstz = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const createdAt = () => tstz('created_at').defaultNow().notNull();

/** UPDATE paytida DB'ning `now()` qiymati — ilova soatiga bog'liq emas. */
export const updatedAt = () =>
  tstz('updated_at')
    .defaultNow()
    .notNull()
    .$onUpdate(() => sql`now()`);

/**
 * Enum o'rniga `text + CHECK` (05-data-model.md konvensiyasi).
 * Qiymatlar `@lg/contracts`dagi konstantadan olinadi — bitta manba.
 */
export const oneOf = (column: AnyPgColumn, values: readonly string[]): SQL =>
  sql`${column} IN (${sql.join(
    values.map((v) => sql.raw(`'${v.replaceAll("'", "''")}'`)),
    sql`, `,
  )})`;
