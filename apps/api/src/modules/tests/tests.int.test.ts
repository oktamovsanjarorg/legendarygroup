import type { ImportPreviewResponse, RoleCode, TestDetailResponse, TestItem } from '@lg/contracts';
import { closeDb, createDb, type Database, guardians, outboxEvents, seed } from '@lg/db';
import { eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

let teacherUserId: string;
let teacherToken: string;
let parentUserId: string;
let parentToken: string;

let groupId: string;
let student1Id: string;
let student1Code: number;
let student2Id: string;
let student2Code: number;
let foreignStudentId: string;
let testId: string;

const call = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: object) =>
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

  const adminToken = tokens.get('admin')!;

  teacherUserId = await createUserWithRole(db, 'teacher');
  teacherToken = await tokenFor(t, db, teacherUserId, 'teacher');

  const courseRes = await call('POST', 'courses', adminToken, {
    name: 'Ingliz tili IELTS',
    defaultMonthlyPrice: '800000',
    lessonDurationMin: 90,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const roomRes = await call('POST', 'rooms', adminToken, { name: 'Xona 204', capacity: 20 });
  const roomId = roomRes.json<{ id: string }>().id;

  const groupRes = await call('POST', 'groups', adminToken, {
    courseId,
    roomId,
    name: 'IELTS-ADV-01',
    maxStudents: 15,
    startDate: '2026-11-01',
    monthlyPrice: '800000',
    teachers: [{ teacherId: teacherUserId, role: 'main' }],
  });
  groupId = groupRes.json<{ id: string }>().id;

  const createStudent = async (fullName: string, phone: string) =>
    (
      await call('POST', 'students', adminToken, {
        fullName,
        guardians: [{ fullName: `Ota-ona ${phone.slice(-4)}`, phone, relation: 'mother' }],
      })
    ).json<{ id: string; code: number; guardians: { guardianId: string }[] }>();

  const s1 = await createStudent('Anvarov Temur Botirovich', '+998901234501');
  const s2 = await createStudent('Saidova Nilufar', '+998901234502');
  const sForeign = await createStudent('Begona Bola', '+998901234509');

  student1Id = s1.id;
  student1Code = s1.code;
  student2Id = s2.id;
  student2Code = s2.code;
  foreignStudentId = sForeign.id;

  await call('POST', 'enrollments', adminToken, {
    studentId: student1Id,
    groupId,
    startDate: '2026-11-01',
  });
  await call('POST', 'enrollments', adminToken, {
    studentId: student2Id,
    groupId,
    startDate: '2026-11-01',
  });

  parentUserId = await createUserWithRole(db, 'guardian', '+998901234501');
  await db
    .update(guardians)
    .set({ userId: parentUserId })
    .where(eq(guardians.id, s1.guardians[0]!.guardianId));
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');
});

afterAll(async () => {
  await closeDb(db);
  await t.app.close();
});

describe('T-302: Testlar va Excel import (Tests & Excel Import)', () => {
  it('RBAC: ota-ona test yarata olmaydi (403 Forbidden)', async () => {
    const res = await call('POST', 'tests', parentToken, {
      groupId,
      title: 'Mock Test 1',
      date: '2026-11-15',
      maxScore: 100,
    });
    expect(res.statusCode).toBe(403);
  });

  it('Admin test yaratadi (boʻlimlar bilan)', async () => {
    const res = await call('POST', 'tests', tokens.get('admin')!, {
      groupId,
      title: 'IELTS Mock Exam 1',
      date: '2026-11-15',
      maxScore: 100,
      sections: [
        { name: 'Listening', maxScore: 40 },
        { name: 'Reading', maxScore: 60 },
      ],
    });
    expect(res.statusCode).toBe(201);
    const data = res.json<TestItem>();
    expect(data.id).toBeDefined();
    expect(data.status).toBe('draft');
    expect(data.sections.length).toBe(2);
    testId = data.id;
  });

  it('guruh testlari roʻyxatini olish (Admin va Ustoz)', async () => {
    const res = await call('GET', `tests?groupId=${groupId}`, tokens.get('admin')!);
    expect(res.statusCode).toBe(200);
    const list = res.json<TestItem[]>();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list.some((item) => item.id === testId)).toBe(true);

    const teacherRes = await call('GET', `tests?groupId=${groupId}`, teacherToken);
    expect(teacherRes.statusCode).toBe(200);
  });

  it('BR-34: Notoʻgʻri ball rad etiladi (max_score dan oshganda)', async () => {
    const res = await call('POST', `tests/${testId}/results`, tokens.get('admin')!, {
      results: [{ studentId: student1Id, score: 105 }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe('TEST_SCORE_INVALID');
  });

  it('BR-34: Notoʻgʻri boʻlim bali rad etiladi (section maxScore dan oshganda)', async () => {
    const res = await call('POST', `tests/${testId}/results`, tokens.get('admin')!, {
      results: [
        {
          studentId: student1Id,
          score: 80,
          sectionScores: [{ sectionName: 'Listening', score: 45 }], // Listening maxScore 40
        },
      ],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe('TEST_SECTION_SCORE_INVALID');
  });

  it('toʻgʻri ballar kiritiladi va versiya yangilanadi', async () => {
    const res = await call('POST', `tests/${testId}/results`, tokens.get('admin')!, {
      results: [
        {
          studentId: student1Id,
          score: 75,
          sectionScores: [
            { sectionName: 'Listening', score: 30 },
            { sectionName: 'Reading', score: 45 },
          ],
        },
      ],
    });
    expect(res.statusCode).toBe(201);

    const getRes = await call('GET', `tests/${testId}`, tokens.get('admin')!);
    expect(getRes.statusCode).toBe(200);
    const detail = getRes.json<TestDetailResponse>();
    expect(detail.results.length).toBe(1);
    expect(detail.results[0]?.score).toBe(75);
    expect(detail.results[0]?.percentage).toBe(75);
    expect(detail.results[0]?.version).toBe(1);

    // Qayta saqlash — versiya 2 ga oshadi
    await call('POST', `tests/${testId}/results`, tokens.get('admin')!, {
      results: [{ studentId: student1Id, score: 80 }],
    });
    const getRes2 = await call('GET', `tests/${testId}`, tokens.get('admin')!);
    const detail2 = getRes2.json<TestDetailResponse>();
    expect(detail2.results[0]?.score).toBe(80);
    expect(detail2.results[0]?.version).toBe(2);
  });

  it('Excel shablonini yuklab olish (template endpoint)', async () => {
    const res = await call('GET', `tests/${testId}/template`, tokens.get('admin')!);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(res.rawPayload.length).toBeGreaterThan(0);
  });

  it('BR-35: Excel import preview (moslashtirish, fuzzy va unmatched)', async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['Kodi', 'F.I.Sh', 'Umumiy ball', 'Listening', 'Reading']);
    // 1-qator: code bo'yicha aniq moslik
    ws.addRow([student1Code, 'Anvarov Temur', 85, 35, 50]);
    // 2-qator: fuzzy moslik (Nilufar Saidova o'rniga Saidova Nilufar)
    ws.addRow(['', 'Saidova Nilufarxon', 90, 38, 52]);
    // 3-qator: noma'lum o'quvchi
    ws.addRow(['99999', 'Nomaʼlum Kimdir', 70, 30, 40]);

    const buf = await wb.xlsx.writeBuffer();
    const base64 = Buffer.from(buf).toString('base64');

    const previewRes = await call('POST', `tests/${testId}/import-preview`, tokens.get('admin')!, {
      fileBase64: base64,
    });
    expect(previewRes.statusCode).toBe(201);
    const preview = previewRes.json<ImportPreviewResponse>();
    expect(preview.matched.length).toBe(1);
    expect(preview.matched[0]?.studentId).toBe(student1Id);

    expect(preview.suggested.length).toBe(1);
    expect(preview.suggested[0]?.suggestedStudentId).toBe(student2Id);
    expect(preview.suggested[0]?.suggestedStudentCode).toBe(student2Code);

    expect(preview.unmatched.length).toBe(1);
  });

  it('BR-35: Excel import tasdiqlash (atomar saqlash va import audit log)', async () => {
    const confirmRes = await call('POST', `tests/${testId}/import-confirm`, tokens.get('admin')!, {
      results: [
        {
          studentId: student1Id,
          score: 88,
          sectionScores: [
            { sectionName: 'Listening', score: 38 },
            { sectionName: 'Reading', score: 50 },
          ],
        },
        {
          studentId: student2Id,
          score: 92,
          sectionScores: [
            { sectionName: 'Listening', score: 40 },
            { sectionName: 'Reading', score: 52 },
          ],
        },
      ],
    });
    expect(confirmRes.statusCode).toBe(201);

    const getRes = await call('GET', `tests/${testId}`, tokens.get('admin')!);
    const detail = getRes.json<TestDetailResponse>();
    expect(detail.results.length).toBe(2);
  });

  it('Test eʼlon qilish (publish) va outbox event tekshiruvi', async () => {
    const pubRes = await call('POST', `tests/${testId}/publish`, tokens.get('admin')!);
    expect(pubRes.statusCode).toBe(201);
    const published = pubRes.json<TestItem>();
    expect(published.status).toBe('published');
    expect(published.publishedAt).toBeDefined();

    const [eventRow] = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.type, 'TestResultsPublished'));
    expect(eventRow).toBeDefined();
    expect((eventRow?.payload as Record<string, unknown>)?.['testId']).toBe(testId);
  });

  it('Eʼlon qilingan testni tahrirlab yoki natija kiritib boʻlmaydi (400)', async () => {
    const res = await call('POST', `tests/${testId}/results`, tokens.get('admin')!, {
      results: [{ studentId: student1Id, score: 95 }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe('TEST_ALREADY_PUBLISHED');
  });

  it('Ota-ona faqat oʻz farzandi test natijalarini koʻra oladi', async () => {
    const res = await call('GET', `tests/student/${student1Id}`, parentToken);
    expect(res.statusCode).toBe(200);
    const list = res.json<Array<{ score: number; percentage: number }>>();
    expect(list.length).toBe(1);
    expect(list[0]?.score).toBe(88);
  });

  it('Ota-ona begona oʻquvchi test natijalarini koʻra olmaydi (IDOR — 404)', async () => {
    const res = await call('GET', `tests/student/${foreignStudentId}`, parentToken);
    expect(res.statusCode).toBe(404);
  });
});
