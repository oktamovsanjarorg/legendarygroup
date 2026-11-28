import { readFileSync } from 'node:fs';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadRootEnv } from './env.js';
import { createTempDb, type TempDb } from './testing.js';

/**
 * T-179: Q-93 dan oldin arxivlangan, a'zoligi ochiq qolgan o'quvchi. Migratsiya barcha
 * migratsiyalar bilan bir marta o'tgan; bu yerda xato holat qayta yaratilib, fayl SQL'i yana
 * ishga tushiriladi (idempotent bo'lishi shart).
 */
const SQL_FILE = new URL('../drizzle/0045_archived_open_enrollments.sql', import.meta.url);

let tmp: TempDb;
let sql: postgres.Sql;

beforeAll(async () => {
  loadRootEnv();
  tmp = await createTempDb();
  sql = postgres(tmp.url, { max: 1, onnotice: () => undefined });
});

afterAll(async () => {
  await sql.end();
  await tmp.drop();
});

const runMigration = () => sql.unsafe(readFileSync(SQL_FILE, 'utf8'));

async function group(): Promise<string> {
  const [c] = await sql<{ id: string }[]>`
    INSERT INTO courses (id, name, default_monthly_price, lesson_duration_min)
    VALUES (uuidv7(), ${`Kurs ${Math.random()}`}, 500000, 90) RETURNING id`;
  const [g] = await sql<{ id: string }[]>`
    INSERT INTO groups (id, course_id, name, monthly_price, max_students, start_date, status, grading_config)
    VALUES (uuidv7(), ${c!.id}, ${`G ${Math.random()}`}, 500000, 20, '2026-11-01', 'active', '{}')
    RETURNING id`;
  return g!.id;
}

/** Arxivlangan o'quvchi + a'zolik; `archivedAt` — UTC vaqt. */
async function archivedMember(archivedAt: string, endDate: string | null) {
  const groupId = await group();
  const [s] = await sql<{ id: string }[]>`
    INSERT INTO students (id, full_name, search_name, archived_at)
    VALUES (uuidv7(), 'Test Oquvchi', 'test oquvchi', ${archivedAt}) RETURNING id`;
  const [e] = await sql<{ id: string }[]>`
    INSERT INTO enrollments (id, student_id, group_id, start_date, end_date, end_reason)
    VALUES (uuidv7(), ${s!.id}, ${groupId}, '2026-11-10', ${endDate},
            ${endDate ? 'left' : null}) RETURNING id`;
  return { studentId: s!.id, enrollmentId: e!.id };
}

const enrollment = async (id: string) =>
  (
    await sql<{ end_date: string | null; end_reason: string | null }[]>`
      SELECT end_date::text, end_reason FROM enrollments WHERE id = ${id}`
  )[0]!;

const audits = async (id: string) =>
  sql<{ action: string; after: { endDate: string; via: string } }[]>`
    SELECT action, after FROM audit_logs WHERE entity = 'enrollment' AND entity_id = ${id}`;

describe('0045 — arxivlangan oʻquvchining ochiq aʼzoligi (T-179, Q-93)', () => {
  it('ochiq aʼzolik arxiv kuni (Toshkent) bilan yopiladi va audit yoziladi', async () => {
    // 2026-11-22 20:30 UTC = 2026-11-23 01:30 Toshkent
    const m = await archivedMember('2026-11-22T20:30:00Z', null);
    await runMigration();
    expect(await enrollment(m.enrollmentId)).toEqual({
      end_date: '2026-11-23',
      end_reason: 'left',
    });
    const a = await audits(m.enrollmentId);
    expect(a).toHaveLength(1);
    expect(a[0]).toMatchObject({
      action: 'enrollment.end',
      after: { endDate: '2026-11-23', via: 'migration' },
    });
  });

  it('arxivdan keyingi chiqish sanasi arxiv kuniga tortiladi; muzlatishlar kesiladi', async () => {
    const m = await archivedMember('2026-11-20T10:00:00Z', '2026-12-31');
    await sql`
      INSERT INTO enrollment_freezes (id, enrollment_id, from_date, to_date, reason) VALUES
        (uuidv7(), ${m.enrollmentId}, '2026-11-15', '2026-11-25', 'kasal'),
        (uuidv7(), ${m.enrollmentId}, '2026-12-01', '2026-12-10', 'safar')`;
    await runMigration();
    expect((await enrollment(m.enrollmentId)).end_date).toBe('2026-11-20');
    const f = await sql<{ from_date: string; to_date: string }[]>`
      SELECT from_date::text, to_date::text FROM enrollment_freezes WHERE enrollment_id = ${m.enrollmentId}`;
    expect(f).toEqual([{ from_date: '2026-11-15', to_date: '2026-11-20' }]);
  });

  it('arxiv kunida yoki undan oldin yopilgan aʼzolikka tegilmaydi', async () => {
    const m = await archivedMember('2026-11-25T20:25:00Z', '2026-11-26');
    await runMigration();
    expect((await enrollment(m.enrollmentId)).end_date).toBe('2026-11-26');
    expect(await audits(m.enrollmentId)).toHaveLength(0);
  });

  it('arxivdan keyingi oyga hisob qatori boʻlsa — tegilmaydi (pul qoʻlda hal qilinadi)', async () => {
    const m = await archivedMember('2026-11-22T10:00:00Z', null);
    const [inv] = await sql<{ id: string }[]>`
      INSERT INTO invoices (id, student_id, period, due_date)
      VALUES (uuidv7(), ${m.studentId}, '2026-12', '2026-12-05') RETURNING id`;
    await sql`
      INSERT INTO invoice_lines (id, invoice_id, enrollment_id, kind, amount, description)
      VALUES (uuidv7(), ${inv!.id}, ${m.enrollmentId}, 'tuition', 500000, 'Dekabr')`;
    await runMigration();
    expect((await enrollment(m.enrollmentId)).end_date).toBeNull();
  });

  it('qayta ishga tushirish xavfsiz — ikkinchi marta hech narsa oʻzgarmaydi', async () => {
    const m = await archivedMember('2026-11-21T10:00:00Z', null);
    await runMigration();
    await runMigration();
    expect(await audits(m.enrollmentId)).toHaveLength(1);
  });
});
