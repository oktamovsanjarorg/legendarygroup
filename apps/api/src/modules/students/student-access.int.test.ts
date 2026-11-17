import {
  type BotStudentLinkResult,
  type RoleCode,
  type StudentAccessCodeResult,
  type StudentDetail,
} from '@lg/contracts';
import { auditLogs, closeDb, createDb, type Database, seed, students } from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let adminToken: string;
const today = formatDateToYmd(new Date());
const baseTg = Date.now();
const tgId = (offset: number) => String(baseTg + offset);

const internalHeaders = {
  'content-type': 'application/json',
  'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN,
};

const call = (method: 'GET' | 'POST', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  adminToken = tokens.get('admin')!;
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Oʻquvchi kirish kodi va Telegram bogʻlanish (T-126, D1–D6)', () => {
  let student1Id: string;
  let student1Phone = '+998901112233';
  let student1Code: string;

  it('1. Admin oʻquvchiga 6 xonali kod yaratadi; auditda kod yoʻq (D2)', async () => {
    const createRes = await call('POST', 'students', adminToken, {
      fullName: 'Anvar Aliyev',
      phone: student1Phone,
    });
    expect(createRes.statusCode).toBe(201);
    student1Id = createRes.json<StudentDetail>().id;

    const codeRes = await call('POST', `students/${student1Id}/access-code`, adminToken);
    expect(codeRes.statusCode).toBe(201);
    const codeData = codeRes.json<StudentAccessCodeResult>();
    expect(codeData.code).toMatch(/^\d{6}$/);
    expect(codeData.updatedAt).toBeDefined();
    student1Code = codeData.code;

    const detailRes = await call('GET', `students/${student1Id}`, adminToken);
    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json<StudentDetail>();
    expect(detail.accessCodeSet).toBe(true);
    expect(detail.telegramLinked).toBe(false);

    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(
        and(eq(auditLogs.action, 'student.access_code_reset'), eq(auditLogs.entityId, student1Id)),
      );
    expect(audit).toBeDefined();
    expect(JSON.stringify(audit)).not.toContain(student1Code);
  });

  it('2. Toʻgʻri telefon + kod → bogʻlanadi va audit yoziladi (D1)', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: { telegramId: tgId(1), phone: student1Phone, code: student1Code },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<BotStudentLinkResult>();
    expect(body.result).toBe('linked');
    expect(body.fullName).toBe('Anvar Aliyev');

    const detailRes = await call('GET', `students/${student1Id}`, adminToken);
    expect(detailRes.json<StudentDetail>().telegramLinked).toBe(true);

    const [audit] = await db
      .select()
      .from(auditLogs)
      .where(
        and(eq(auditLogs.action, 'student.telegram_linked'), eq(auditLogs.entityId, student1Id)),
      );
    expect(audit).toBeDefined();
  });

  it('3. Ota-ona telefoni + farzand kodi → bogʻlanadi (D1)', async () => {
    const parentPhone = '+998907778899';
    const createRes = await call('POST', 'students', adminToken, {
      fullName: 'Farhod Karimov',
      phone: '+998903334455',
      guardians: [{ fullName: 'Karim Ota', phone: parentPhone, relation: 'father' }],
    });
    const s2Id = createRes.json<StudentDetail>().id;
    const codeRes = await call('POST', `students/${s2Id}/access-code`, adminToken);
    const s2Code = codeRes.json<StudentAccessCodeResult>().code;

    const res = await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: { telegramId: tgId(2), phone: parentPhone, code: s2Code },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json<BotStudentLinkResult>().result).toBe('linked');
  });

  it('4. Begona telefon yoki notoʻgʻri kod → invalid', async () => {
    const badRes1 = await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: { telegramId: tgId(3), phone: '+998909990000', code: '000000' },
    });
    expect(badRes1.json<BotStudentLinkResult>().result).toBe('invalid');

    const createRes = await call('POST', 'students', adminToken, { fullName: 'Testbola' });
    const sId = createRes.json<StudentDetail>().id;
    const codeRes = await call('POST', `students/${sId}/access-code`, adminToken);
    const validCode = codeRes.json<StudentAccessCodeResult>().code;

    const badRes2 = await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: { telegramId: tgId(3), phone: '+998901234567', code: validCode },
    });
    expect(badRes2.json<BotStudentLinkResult>().result).toBe('invalid');
  });

  it('5. 6-urinish → rate_limited (D3)', async () => {
    const testTg = tgId(4);
    for (let i = 0; i < 5; i += 1) {
      const r = await t.app.inject({
        method: 'POST',
        url: '/internal/student/link',
        headers: internalHeaders,
        payload: { telegramId: testTg, phone: '+998900000000', code: '111111' },
      });
      expect(r.json<BotStudentLinkResult>().result).toBe('invalid');
    }
    const sixth = await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: { telegramId: testTg, phone: '+998900000000', code: '111111' },
    });
    expect(sixth.json<BotStudentLinkResult>().result).toBe('rate_limited');
  });

  it('6. Kod yangilangach eski kod ishlamaydi (D2)', async () => {
    const createRes = await call('POST', 'students', adminToken, {
      fullName: 'Sardor Shokirov',
      phone: '+998904445566',
    });
    const sId = createRes.json<StudentDetail>().id;
    const codeRes1 = await call('POST', `students/${sId}/access-code`, adminToken);
    const oldCode = codeRes1.json<StudentAccessCodeResult>().code;

    await call('POST', `students/${sId}/access-code`, adminToken);

    const res = await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: { telegramId: tgId(5), phone: '+998904445566', code: oldCode },
    });
    expect(res.json<BotStudentLinkResult>().result).toBe('invalid');
  });

  it('7. Arxivdagi oʻquvchi → invalid', async () => {
    const createRes = await call('POST', 'students', adminToken, {
      fullName: 'Arxiv Bola',
      phone: '+998905556677',
    });
    const sId = createRes.json<StudentDetail>().id;
    const codeRes = await call('POST', `students/${sId}/access-code`, adminToken);
    const code = codeRes.json<StudentAccessCodeResult>().code;

    await call('POST', `students/${sId}/archive`, adminToken);

    const res = await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: { telegramId: tgId(6), phone: '+998905556677', code },
    });
    expect(res.json<BotStudentLinkResult>().result).toBe('invalid');
  });

  it('8. Telegramdan uzishdan keyin token darhol yaroqsiz (D6)', async () => {
    const [row] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.id, student1Id));
    expect(row?.userId).toBeDefined();

    const studentToken = await tokenFor(t, db, row!.userId!, 'student');

    const meResBefore = await call('GET', `students/${student1Id}`, studentToken);
    expect(meResBefore.statusCode).toBe(200);

    const unlinkRes = await call('POST', `students/${student1Id}/telegram-unlink`, adminToken);
    expect(unlinkRes.statusCode).toBe(200);

    const meResAfter = await call('GET', `students/${student1Id}`, studentToken);
    expect(meResAfter.statusCode).toBe(401);
  });

  it('9. Oʻquvchi arxivlanganda ham Telegramdan uziladi (D6)', async () => {
    const createRes = await call('POST', 'students', adminToken, {
      fullName: 'Arxiv Uzish',
      phone: '+998906667788',
    });
    const sId = createRes.json<StudentDetail>().id;
    const codeRes = await call('POST', `students/${sId}/access-code`, adminToken);
    const code = codeRes.json<StudentAccessCodeResult>().code;

    await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: { telegramId: tgId(7), phone: '+998906667788', code },
    });

    const [row] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.id, sId));
    const token = await tokenFor(t, db, row!.userId!, 'student');

    expect((await call('GET', `students/${sId}`, token)).statusCode).toBe(200);

    await call('POST', `students/${sId}/archive`, adminToken);

    expect((await call('GET', `students/${sId}`, token)).statusCode).toBe(401);
  });

  it('10. Forbidden: oʻquvchi begona oʻquvchini, toʻlovlarni va xodim endpointlarini ololmaydi', async () => {
    const createRes = await call('POST', 'students', adminToken, {
      fullName: 'Begona Oʻquvchi',
      phone: '+998907779900',
    });
    const foreignId = createRes.json<StudentDetail>().id;

    const createOwn = await call('POST', 'students', adminToken, {
      fullName: 'Mening Oʻquvchim',
      phone: '+998908889911',
    });
    const ownId = createOwn.json<StudentDetail>().id;
    const codeRes = await call('POST', `students/${ownId}/access-code`, adminToken);
    await t.app.inject({
      method: 'POST',
      url: '/internal/student/link',
      headers: internalHeaders,
      payload: {
        telegramId: tgId(8),
        phone: '+998908889911',
        code: codeRes.json<StudentAccessCodeResult>().code,
      },
    });
    const [row] = await db
      .select({ userId: students.userId })
      .from(students)
      .where(eq(students.id, ownId));
    const studentToken = await tokenFor(t, db, row!.userId!, 'student');

    expect((await call('GET', `students/${foreignId}`, studentToken)).statusCode).toBe(404);
    expect((await call('GET', 'billing/debtors', studentToken)).statusCode).toBe(403);
    expect((await call('GET', 'staff', studentToken)).statusCode).toBe(403);
    expect((await call('POST', 'students', studentToken, { fullName: 'X' })).statusCode).toBe(403);

    expect((await call('GET', `students/${ownId}`, studentToken)).statusCode).toBe(200);
    expect(
      (
        await call(
          'GET',
          `students/${ownId}/lessons?from=${today}&to=${addDays(today, 10)}`,
          studentToken,
        )
      ).statusCode,
    ).toBe(200);
    expect(
      (await call('GET', `attendance/history?studentId=${ownId}`, studentToken)).statusCode,
    ).toBe(200);
    expect((await call('GET', `tests/student/${ownId}`, studentToken)).statusCode).toBe(200);
  });
});
