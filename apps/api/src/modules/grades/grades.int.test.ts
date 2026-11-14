import type { LessonGradesResponse, RoleCode } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  grades,
  guardians,
  lessons,
  seed,
  teacherComments,
} from '@lg/db';
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
let lessonId: string;
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

  const courseRes = await call('POST', 'courses', adminToken, {
    name: 'Fizika Intensive',
    defaultMonthlyPrice: '650000',
    lessonDurationMin: 60,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const roomRes = await call('POST', 'rooms', adminToken, { name: 'Laboratoriya 1', capacity: 15 });
  const roomId = roomRes.json<{ id: string }>().id;

  // Guruh baholash sozlamasi: 0_5 shkala, homework va activity
  const groupRes = await call('POST', 'groups', adminToken, {
    courseId,
    roomId,
    name: 'PHYS-101',
    maxStudents: 15,
    startDate: '2026-11-01',
    monthlyPrice: '650000',
    gradingConfig: {
      scale: '0_5',
      kinds: ['homework', 'activity'],
    },
    teachers: [{ teacherId: teacherUserId, role: 'main' }],
  });
  groupId = groupRes.json<{ id: string }>().id;

  const createStudent = async (fullName: string, phone: string) =>
    (
      await call('POST', 'students', adminToken, {
        fullName,
        guardians: [{ fullName: `Ota-ona ${phone.slice(-4)}`, phone, relation: 'mother' }],
      })
    ).json<{ id: string; guardians: { guardianId: string }[] }>();

  const s1 = await createStudent('Olimjon Toirov', '+998909876501');
  const s2 = await createStudent('Sardor Umarov', '+998909876502');
  const sForeign = await createStudent('Begona Bola', '+998909876509');

  student1Id = s1.id;
  student2Id = s2.id;
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

  parentUserId = await createUserWithRole(db, 'guardian', '+998909876501');
  await db
    .update(guardians)
    .set({ userId: parentUserId })
    .where(eq(guardians.id, s1.guardians[0]!.guardianId));
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  const [l] = await db
    .insert(lessons)
    .values({
      groupId,
      date: '2026-11-13',
      startTime: '10:00',
      endTime: '11:00',
      roomId,
      teacherId: teacherUserId,
      status: 'scheduled',
    })
    .returning();
  lessonId = l!.id;
});

afterAll(async () => {
  await closeDb(db);
  await t.app.close();
});

describe('T-301 Baholar va ustoz izohlari (FR-GRD-1, 2, BR-33)', () => {
  it('dars baholari va guruh shkalasini olish (FR-GRD-1)', async () => {
    const res = await call('GET', `grades/lessons/${lessonId}`, teacherToken);
    expect(res.statusCode).toBe(200);
    const body = res.json<LessonGradesResponse>();
    expect(body.scale).toBe('0_5');
    expect(body.allowedKinds).toEqual(['homework', 'activity']);
    expect(body.grades).toEqual([]);
    expect(body.comments).toEqual([]);
  });

  it('ustoz darsda oʻquvchilarga baho va izoh qoʻya oladi (FR-GRD-1, 2)', async () => {
    const res = await call('POST', `grades/lessons/${lessonId}`, teacherToken, {
      grades: [
        { studentId: student1Id, kind: 'homework', value: 5 },
        { studentId: student1Id, kind: 'activity', value: 4 },
        { studentId: student2Id, kind: 'homework', value: 3 },
      ],
      comments: [
        {
          studentId: student1Id,
          text: 'Vazifani aʼlo darajada bajardi.',
          visibility: 'guardian',
        },
        {
          studentId: student1Id,
          text: 'Ichki eslatma: keyingi darsda qoʻshimcha formula berish kerak.',
          visibility: 'internal',
        },
      ],
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<LessonGradesResponse>();
    expect(body.grades.length).toBe(3);
    expect(body.comments.length).toBe(2);

    const dbGrades = await db.select().from(grades).where(eq(grades.lessonId, lessonId));
    expect(dbGrades.length).toBe(3);

    const dbComments = await db
      .select()
      .from(teacherComments)
      .where(eq(teacherComments.lessonId, lessonId));
    expect(dbComments.length).toBe(2);
  });

  it('BR-33 shkaladan oshiq baho kiritilganda rad etiladi (400 GRADE_SCALE_EXCEEDED)', async () => {
    const res = await call('POST', `grades/lessons/${lessonId}`, teacherToken, {
      grades: [{ studentId: student2Id, kind: 'homework', value: 8 }],
    });
    expect(res.statusCode).toBe(400);
    expect(res.json<{ code: string }>().code).toBe('GRADE_SCALE_EXCEEDED');
  });

  it('begona ustoz darsga baho qoʻya olmaydi (Scope himoyasi)', async () => {
    const res = await call('POST', `grades/lessons/${lessonId}`, teacher2Token, {
      grades: [{ studentId: student1Id, kind: 'homework', value: 4 }],
    });
    expect([403, 404]).toContain(res.statusCode);
  });

  it('ota-ona oʻz farzandi baholarini va faqat guardian izohlarini koʻra oladi', async () => {
    const res = await call('GET', `grades/history?studentId=${student1Id}`, parentToken);
    expect(res.statusCode).toBe(200);
    const data = res.json<{
      studentId: string;
      grades: Array<{ id: string; value: number }>;
      comments: Array<{ visibility: string; text: string }>;
    }>();
    expect(data.grades.length).toBe(2);
    // Faqat guardian ko'rinishidagi izoh chiqishi kerak
    expect(data.comments.length).toBe(1);
    expect(data.comments[0]?.visibility).toBe('guardian');
    expect(data.comments[0]?.text).toContain('aʼlo darajada');
  });

  it('ota-ona begona oʻquvchi baholarini koʻra olmaydi (IDOR himoyasi — 404)', async () => {
    const res = await call('GET', `grades/history?studentId=${foreignStudentId}`, parentToken);
    expect(res.statusCode).toBe(404);
  });

  describe('T-303 Oʻquvchi progressi va guruh reytingi (FR-GRD-5)', () => {
    it('ustoz guruh reytingini (leaderboard) koʻra oladi', async () => {
      const res = await call('GET', `grades/groups/${groupId}/leaderboard`, teacherToken);
      expect(res.statusCode).toBe(200);
      const data = res.json<{
        groupId: string;
        groupName: string;
        students: Array<{
          studentId: string;
          studentName: string;
          rank: number;
          compositeScore: number;
          averageGrade: number;
        }>;
      }>();

      expect(data.groupId).toBe(groupId);
      expect(data.groupName).toBe('PHYS-101');
      expect(data.students.length).toBe(2);

      // Olimjon Toirov baholari yuqori bo'lgani sababli 1-o'rinda
      expect(data.students[0]?.studentId).toBe(student1Id);
      expect(data.students[0]?.rank).toBe(1);
      expect(data.students[0]?.averageGrade).toBeGreaterThan(data.students[1]!.averageGrade);
      expect(data.students[1]?.studentId).toBe(student2Id);
      expect(data.students[1]?.rank).toBe(2);
    });

    it('ota-ona oʻz farzandining toʻliq progress dinamikasini oladi (FR-GRD-5)', async () => {
      const res = await call('GET', `grades/students/${student1Id}/progress`, parentToken);
      expect(res.statusCode).toBe(200);
      const data = res.json<{
        studentId: string;
        studentName: string;
        rank: number;
        totalStudents: number;
        averageGrade: number;
        gradesTrend: Array<{ kind: string; value: number }>;
      }>();

      expect(data.studentId).toBe(student1Id);
      expect(data.studentName).toBe('Olimjon Toirov');
      expect(data.rank).toBe(1);
      expect(data.totalStudents).toBe(2);
      expect(data.gradesTrend.length).toBe(2);
    });

    it('ota-ona begona oʻquvchining progressini koʻra olmaydi (404 IDOR himoyasi)', async () => {
      const res = await call('GET', `grades/students/${foreignStudentId}/progress`, parentToken);
      expect(res.statusCode).toBe(404);
    });
  });
});
