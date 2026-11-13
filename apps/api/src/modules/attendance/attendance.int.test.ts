import type { LessonAttendance, RoleCode } from '@lg/contracts';
import { attendance, closeDb, createDb, type Database, guardians, lessons, seed } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

let teacherUserId: string;
let teacherToken: string;
let teacher2Token: string;
let parentUserId: string;
let parentToken: string;

let groupId: string;
let todayLessonId: string;
let pastLessonId: string;
let student1Id: string;
let student2Id: string;
let foreignStudentId: string;

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

  const adminToken = tokens.get('admin')!;

  teacherUserId = await createUserWithRole(db, 'teacher');
  teacherToken = await tokenFor(t, db, teacherUserId, 'teacher');

  const teacher2UserId = await createUserWithRole(db, 'teacher');
  teacher2Token = await tokenFor(t, db, teacher2UserId, 'teacher');

  // Kurs va xona
  const courseRes = await call('POST', 'courses', adminToken, {
    name: 'Ingliz tili IELTS',
    defaultMonthlyPrice: '700000',
    lessonDurationMin: 80,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const roomRes = await call('POST', 'rooms', adminToken, { name: 'Room 201', capacity: 20 });
  const roomId = roomRes.json<{ id: string }>().id;

  // Guruh
  const groupRes = await call('POST', 'groups', adminToken, {
    courseId,
    roomId,
    name: 'IELTS-A1',
    maxStudents: 15,
    startDate: '2026-11-01',
    monthlyPrice: '700000',
    teachers: [{ teacherId: teacherUserId, role: 'main' }],
  });
  groupId = groupRes.json<{ id: string }>().id;

  // O'quvchilar
  const createStudent = async (fullName: string, phone: string) =>
    (
      await call('POST', 'students', adminToken, {
        fullName,
        guardians: [{ fullName: `Ota-ona ${phone.slice(-4)}`, phone, relation: 'father' }],
      })
    ).json<{ id: string; guardians: { guardianId: string }[] }>();

  const s1 = await createStudent('Temur Malik', '+998901234501');
  const s2 = await createStudent('Jaloliddin Manguberdi', '+998901234502');
  const sForeign = await createStudent('Begona Oʻquvchi', '+998901234509');

  student1Id = s1.id;
  student2Id = s2.id;
  foreignStudentId = sForeign.id;

  // Guruhga yozish (Enrollment)
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

  // Ota-ona foydalanuvchisi
  parentUserId = await createUserWithRole(db, 'guardian', '+998901234501');
  await db
    .update(guardians)
    .set({ userId: parentUserId })
    .where(eq(guardians.id, s1.guardians[0]!.guardianId));
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  // Bugungi dars (2026-11-13) va kechagi dars (2026-11-12)
  const today = '2026-11-13';
  const yesterday = '2026-11-12';

  const [lToday] = await db
    .insert(lessons)
    .values({
      groupId,
      date: today,
      startTime: '14:00',
      endTime: '15:20',
      roomId,
      teacherId: teacherUserId,
      status: 'scheduled',
    })
    .returning();
  todayLessonId = lToday!.id;

  const [lPast] = await db
    .insert(lessons)
    .values({
      groupId,
      date: yesterday,
      startTime: '14:00',
      endTime: '15:20',
      roomId,
      teacherId: teacherUserId,
      status: 'scheduled',
    })
    .returning();
  pastLessonId = lPast!.id;
});

afterAll(async () => {
  await closeDb(db);
  await t.app.close();
});

describe('T-111, T-112, T-113 Davomat tizimi (BR-29, BR-30, BR-31, BR-32)', () => {
  it('ustoz bugungi dars davomatini koʻra oladi (FR-ATT-1, BR-32)', async () => {
    const res = await call('GET', `attendance/lessons/${todayLessonId}`, teacherToken);
    expect(res.statusCode).toBe(200);
    const body = res.json<LessonAttendance>();
    expect(body.lessonId).toBe(todayLessonId);
    expect(body.canEdit).toBe(true);
    expect(body.expectedStudents.length).toBe(2);
    expect(body.expectedStudents.map((s) => s.id)).toContain(student1Id);
    expect(body.expectedStudents.map((s) => s.id)).toContain(student2Id);
  });

  it('ustoz bugungi darsga davomat belgilaydi (FR-ATT-2, BR-29)', async () => {
    const res = await call('POST', `attendance/lessons/${todayLessonId}`, teacherToken, {
      clientMutationId: 'offline-mut-001',
      items: [
        { studentId: student1Id, status: 'present' },
        { studentId: student2Id, status: 'late', lateMinutes: 20, note: 'Tirbandlik sababli' },
      ],
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<LessonAttendance>();
    expect(body.records.length).toBe(2);

    const r2 = body.records.find((r) => r.studentId === student2Id);
    expect(r2?.status).toBe('late');
    expect(r2?.lateMinutes).toBe(20);

    const rows = await db.select().from(attendance).where(eq(attendance.lessonId, todayLessonId));
    expect(rows.length).toBe(2);
    expect(rows[0]?.clientMutationId).toBe('offline-mut-001');
  });

  it('BR-32 darsga yozilmagan begona oʻquvchiga davomat qoʻyish taqiqlanadi (400)', async () => {
    const res = await call('POST', `attendance/lessons/${todayLessonId}`, teacherToken, {
      items: [{ studentId: foreignStudentId, status: 'present' }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe('STUDENT_NOT_ENROLLED');
  });

  it('BR-30 ustoz oʻtgan kungi dars davomatini oʻzgartira olmaydi (409 Conflict)', async () => {
    const res = await call('POST', `attendance/lessons/${pastLessonId}`, teacherToken, {
      items: [{ studentId: student1Id, status: 'present' }],
    });
    expect(res.statusCode).toBe(409);
    expect(res.json<{ code: string }>().code).toBe('ATTENDANCE_LOCKED_PAST');
  });

  it('BR-30 admin oʻtgan kungi dars davomatini sababsiz oʻzgartira olmaydi (400)', async () => {
    const adminToken = tokens.get('admin')!;
    const res = await call('POST', `attendance/lessons/${pastLessonId}`, adminToken, {
      items: [{ studentId: student1Id, status: 'present' }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe('CHANGE_REASON_REQUIRED');
  });

  it('BR-30 admin oʻtgan kungi dars davomatini sabab bilan oʻzgartira oladi (201)', async () => {
    const adminToken = tokens.get('admin')!;
    const res = await call('POST', `attendance/lessons/${pastLessonId}`, adminToken, {
      changeReason: 'Oʻquvchi kasallik varaqasini taqdim etdi',
      items: [{ studentId: student1Id, status: 'excused', note: 'Kasallik sababli' }],
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<LessonAttendance>();
    const r1 = body.records.find((r) => r.studentId === student1Id);
    expect(r1?.status).toBe('excused');
  });

  it('boshqa guruh ustozi dars davomatini belgilay olmaydi (Scope himoyasi)', async () => {
    const res = await call('POST', `attendance/lessons/${todayLessonId}`, teacher2Token, {
      items: [{ studentId: student1Id, status: 'present' }],
    });
    expect([403, 404]).toContain(res.statusCode);
  });

  it('ota-ona oʻz farzandining davomat tarixini koʻra oladi', async () => {
    const res = await call('GET', `attendance/history?studentId=${student1Id}`, parentToken);
    expect(res.statusCode).toBe(200);
    const list = res.json<{ groupName: string }[]>();
    expect(list.length).toBeGreaterThanOrEqual(1);
    expect(list[0]?.groupName).toBe('IELTS-A1');
  });

  it('ota-ona begona oʻquvchining davomat tarixini koʻra olmaydi (IDOR himoyasi — 404)', async () => {
    const res = await call('GET', `attendance/history?studentId=${foreignStudentId}`, parentToken);
    expect(res.statusCode).toBe(404);
  });
});
