import { type BotStudentLinkResult, type StudentAccessCodeResult } from '@lg/contracts';
import { closeDb, createDb, type Database, seed, students, users } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let adminToken: string;
const baseTg = BigInt(Date.now()) * 10n;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  adminToken = (await tokensForAllRoles(t, db)).get('admin')!;
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

const call = (url: string, payload?: object) =>
  t.app.inject({
    method: 'POST',
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${adminToken}` },
  });

const link = (telegramId: bigint, phone: string, code: string) =>
  t.app.inject({
    method: 'POST',
    url: '/internal/student/link',
    headers: {
      'content-type': 'application/json',
      'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN,
    },
    payload: { telegramId: String(telegramId), phone, code },
  });

describe('T-126 review: oʻquvchi oqimi mavjud akkauntning Telegram bogʻlanishini almashtirmaydi', () => {
  it('telefoni mos, lekin boshqa Telegram`ga bogʻlangan foydalanuvchi → in_use, telegram_id oʻzgarmaydi', async () => {
    const phone = '+998909990011';
    const staffTg = baseTg + 1n;
    const [staff] = await db
      .insert(users)
      .values({ fullName: 'Ustoz Ota', phone, telegramId: staffTg, status: 'active' })
      .returning();

    const created = await call('students', {
      fullName: 'Ustoz Farzandi',
      phone: '+998909990022',
      guardians: [{ fullName: 'Ustoz Ota', phone, relation: 'father' }],
    });
    const sId = created.json<{ id: string }>().id;
    const code = (await call(`students/${sId}/access-code`)).json<StudentAccessCodeResult>().code;

    const res = await link(baseTg + 2n, phone, code);
    expect(res.json<BotStudentLinkResult>().result).toBe('in_use');

    const [after] = await db.select().from(users).where(eq(users.id, staff!.id));
    expect(after?.telegramId).toBe(staffTg);
    const [s] = await db.select().from(students).where(eq(students.id, sId));
    expect(s?.userId).toBeNull();
  });

  it('telefoni mos, Telegram`siz foydalanuvchi → bogʻlanadi', async () => {
    const phone = '+998909990033';
    const [u] = await db
      .insert(users)
      .values({ fullName: 'Ona', phone, status: 'active' })
      .returning();
    const created = await call('students', {
      fullName: 'Ona Farzandi',
      guardians: [{ fullName: 'Ona', phone, relation: 'mother' }],
    });
    const sId = created.json<{ id: string }>().id;
    const code = (await call(`students/${sId}/access-code`)).json<StudentAccessCodeResult>().code;

    const tg = baseTg + 3n;
    expect((await link(tg, phone, code)).json<BotStudentLinkResult>().result).toBe('linked');
    const [after] = await db.select().from(users).where(eq(users.id, u!.id));
    expect(after?.telegramId).toBe(tg);
  });

  it('oʻquvchi boshqa Telegramga bogʻlangan → in_use; oʻsha Telegram qayta → already_linked', async () => {
    const phone = '+998909990044';
    const created = await call('students', { fullName: 'Ikki Telegram', phone });
    const sId = created.json<{ id: string }>().id;
    const code = (await call(`students/${sId}/access-code`)).json<StudentAccessCodeResult>().code;

    const tg = baseTg + 4n;
    expect((await link(tg, phone, code)).json<BotStudentLinkResult>().result).toBe('linked');
    expect((await link(baseTg + 5n, phone, code)).json<BotStudentLinkResult>().result).toBe(
      'in_use',
    );
    expect((await link(tg, phone, code)).json<BotStudentLinkResult>().result).toBe(
      'already_linked',
    );
  });
});
