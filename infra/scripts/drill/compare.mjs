import { closeDb, createDb } from '@lg/db';
import { sql } from 'drizzle-orm';
/**
 * RDS restore drill (T-015): prod va snapshot'dan tiklangan instansiyani solishtiradi.
 * Snapshot vaqtigacha yaratilgan yozuvlar soni va pul yig'indilari teng bo'lishi shart;
 * o'zgarmaslik trigger'lari (forbid_mutation) tiklangan bo'lishi shart.
 * Ishga tushirish: api konteynerida — DRILL_HOST=<endpoint> SNAPSHOT_TIME=<ISO> node compare.mjs
 */
const T = process.env.SNAPSHOT_TIME;
if (!T || !/^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(T))
  throw new Error('SNAPSHOT_TIME (ISO, UTC) kerak');
if (!process.env.DRILL_HOST) throw new Error('DRILL_HOST kerak');
const prodUrl = process.env.DATABASE_URL;
const u = new URL(prodUrl);
u.hostname = process.env.DRILL_HOST;
const snap = async (url) => {
  const db = createDb(url, { max: 1 });
  const one = async (q) => [...(await db.execute(q))][0];
  const out = {};
  for (const t of [
    'users',
    'students',
    'guardians',
    'courses',
    'groups',
    'enrollments',
    'invoices',
    'payments',
    'receipts',
    'ledger_entries',
  ]) {
    out[t] = (
      await one(sql.raw(`SELECT count(*)::int AS n FROM ${t} WHERE created_at <= '${T}'`))
    ).n;
  }
  out.audit_logs = (
    await one(sql.raw(`SELECT count(*)::int AS n FROM audit_logs WHERE at <= '${T}'`))
  ).n;
  out.paymentsSum = (
    await one(
      sql.raw(`SELECT coalesce(sum(amount),0)::text AS s FROM payments WHERE created_at <= '${T}'`),
    )
  ).s;
  out.ledgerSum = (
    await one(
      sql.raw(
        `SELECT coalesce(sum(amount),0)::text AS s FROM ledger_entries WHERE created_at <= '${T}'`,
      ),
    )
  ).s;
  out.tables = (
    await one(
      sql.raw(
        `SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema = 'public'`,
      ),
    )
  ).n;
  out.immutableTriggers = (
    await one(
      sql.raw(
        `SELECT count(*)::int AS n FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid WHERE NOT t.tgisinternal AND p.proname = 'forbid_mutation'`,
      ),
    )
  ).n;
  await closeDb(db);
  return out;
};
const [p, d] = [await snap(prodUrl), await snap(u.toString())];
const diff = Object.keys(p).filter((k) => String(p[k]) !== String(d[k]));
console.log(
  JSON.stringify({
    prod: p,
    drill: d,
    mismatched: diff,
    ok: diff.length === 0 && d.immutableTriggers > 0,
  }),
);
