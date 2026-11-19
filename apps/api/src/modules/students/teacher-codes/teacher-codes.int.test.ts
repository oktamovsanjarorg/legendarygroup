import type { ImportPreviewResponse, RoleCode, TeacherCodesResult, TestItem } from '@lg/contracts';
import { auditLogs, closeDb, createDb, type Database, seed } from '@lg/db';
import { and, eq } from 'drizzle-orm';
import ExcelJS from 'exceljs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let admin: string;
let teacherA: string;
let teacherB: string;
let groupA: string;
let groupB: string;
const ids: Record<'s1' | 's2' | 's3' | 'outsider', string> = {
  s1: '',
  s2: '',
  s3: '',
  outsider: '',
};

const call = (method: 'GET' | 'POST' | 'PUT', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });

const save = (
  token: string,
  groupId: string,
  items: { studentId: string; code: number | null }[],
) => call('PUT', 'teacher-codes', token, { groupId, items });

const codeOf = (r: TeacherCodesResult, id: string) => r.items.find((i) => i.studentId === id)?.code;

async function makeGroup(name: string, teacherId: string, courseId: string): Promise<string> {
  const res = await call('POST', 'groups', admin, {
    courseId,
    name,
    maxStudents: 15,
    startDate: '2026-11-01',
    monthlyPrice: '500000',
    teachers: [{ teacherId, role: 'main' }],
  });
  return res.json<{ id: string }>().id;
}

async function makeStudent(fullName: string, groups: string[]): Promise<string> {
  const id = (await call('POST', 'students', admin, { fullName })).json<{ id: string }>().id;
  for (const groupId of groups) {
    await call('POST', 'enrollments', admin, { studentId: id, groupId, startDate: '2026-11-01' });
  }
  return id;
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  admin = tokens.get('admin')!;
  const aId = await createUserWithRole(db, 'teacher');
  const bId = await createUserWithRole(db, 'teacher');
  teacherA = await tokenFor(t, db, aId, 'teacher');
  teacherB = await tokenFor(t, db, bId, 'teacher');
  const courseId = (
    await call('POST', 'courses', admin, {
      name: 'Matematika',
      defaultMonthlyPrice: '500000',
      lessonDurationMin: 90,
    })
  ).json<{ id: string }>().id;
  groupA = await makeGroup('MAT-A', aId, courseId);
  groupB = await makeGroup('MAT-B', bId, courseId);
  ids.s1 = await makeStudent('Aliyev Bek', [groupA, groupB]);
  ids.s2 = await makeStudent('Boboyev Sardor', [groupA]);
  ids.s3 = await makeStudent('Valiyeva Zarina', [groupA]);
  ids.outsider = await makeStudent('Begona Bola', [groupB]);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Ustozning oʻz oʻquvchi kodlari (T-128, Q-92)', () => {
  it('roʻyxat: kodlar yoʻq, tizim 1, 2, 3 ni taklif qiladi', async () => {
    const res = await call('GET', `teacher-codes?groupId=${groupA}`, teacherA);
    expect(res.statusCode).toBe(200);
    const body = res.json<TeacherCodesResult>();
    expect(body.items.map((i) => [i.code, i.suggested])).toEqual([
      [null, 1],
      [null, 2],
      [null, 3],
    ]);
  });

  it('ustoz oʻzi kiritgan kodlar saqlanadi, taklif keyingi boʻsh kodga oʻtadi, audit yoziladi', async () => {
    const res = await save(teacherA, groupA, [
      { studentId: ids.s1, code: 7 },
      { studentId: ids.s2, code: 1 },
    ]);
    expect(res.statusCode).toBe(200);
    const body = res.json<TeacherCodesResult>();
    expect(codeOf(body, ids.s1)).toBe(7);
    expect(body.items.find((i) => i.studentId === ids.s3)?.suggested).toBe(2);

    const audit = await db
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.action, 'student.teacher_code_set'), eq(auditLogs.entityId, ids.s1)));
    expect(audit[0]?.after).toEqual({ code: 7 });
  });

  it('band kod → 409; bir soʻrovda takror → 400; almashtirish (1↔7) ishlaydi', async () => {
    const taken = await save(teacherA, groupA, [{ studentId: ids.s3, code: 7 }]);
    expect(taken.statusCode).toBe(409);
    expect(taken.json<{ code: string }>().code).toBe('STUDENT_CODE_TAKEN');

    const dup = await save(teacherA, groupA, [
      { studentId: ids.s3, code: 5 },
      { studentId: ids.s2, code: 5 },
    ]);
    expect(dup.statusCode).toBe(400);

    const swap = await save(teacherA, groupA, [
      { studentId: ids.s1, code: 1 },
      { studentId: ids.s2, code: 7 },
    ]);
    expect(swap.statusCode).toBe(200);
    expect(codeOf(swap.json<TeacherCodesResult>(), ids.s1)).toBe(1);
  });

  it('har ustozda alohida baza: B ustoz shu oʻquvchiga ham, oʻz oʻquvchisiga ham 1 berishi mumkin', async () => {
    const res = await save(teacherB, groupB, [
      { studentId: ids.outsider, code: 1 },
      { studentId: ids.s1, code: 2 },
    ]);
    expect(res.statusCode).toBe(200);
    const a = (
      await call('GET', `teacher-codes?groupId=${groupA}`, teacherA)
    ).json<TeacherCodesResult>();
    expect(codeOf(a, ids.s1)).toBe(1);
  });

  it('null — kod olib tashlanadi', async () => {
    const res = await save(teacherA, groupA, [{ studentId: ids.s3, code: null }]);
    expect(res.statusCode).toBe(200);
    expect(codeOf(res.json<TeacherCodesResult>(), ids.s3)).toBeNull();
  });

  it('forbidden: admin/ota-ona → 403, begona guruh → 404, guruhda yoʻq oʻquvchi → 404', async () => {
    expect((await call('GET', `teacher-codes?groupId=${groupA}`, admin)).statusCode).toBe(403);
    for (const role of ['guardian', 'student'] as const) {
      const token = tokens.get(role)!;
      expect((await call('GET', `teacher-codes?groupId=${groupA}`, token)).statusCode).toBe(403);
      expect((await save(token, groupA, [{ studentId: ids.s1, code: 9 }])).statusCode).toBe(403);
    }
    expect((await call('GET', `teacher-codes?groupId=${groupA}`, teacherB)).statusCode).toBe(404);
    const foreign = await save(teacherA, groupA, [{ studentId: ids.outsider, code: 9 }]);
    expect(foreign.statusCode).toBe(404);
  });

  it('Excel import: ustoz kodi (titul skaneri nol bilan — `001`) boʻyicha moslik', async () => {
    const test = await call('POST', 'tests', teacherA, {
      groupId: groupA,
      title: 'Titul 1',
      date: '2026-11-15',
      maxScore: 30,
      sections: [],
    });
    expect(test.statusCode).toBe(201);
    const testId = test.json<TestItem>().id;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Sheet1');
    ws.addRow(['Kodi', 'F.I.Sh', 'Umumiy ball']);
    ws.addRow(['001', '', 25]);
    ws.addRow(['007', '', 20]);
    const fileBase64 = Buffer.from(await wb.xlsx.writeBuffer()).toString('base64');
    const res = await call('POST', `tests/${testId}/import-preview`, teacherA, { fileBase64 });
    const preview = res.json<ImportPreviewResponse>();
    expect(preview.matched.map((m) => [m.studentId, m.studentCode])).toEqual([
      [ids.s1, 1],
      [ids.s2, 7],
    ]);
  });
});
