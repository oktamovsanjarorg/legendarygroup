import type { RoleCode } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  guardians,
  lessons,
  notifications,
  outboxEvents,
  seed,
} from '@lg/db';
import { eq, and, like } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { AttendanceNoticeProcessor } from './attendance-notice.processor.js';
import { AttendanceNoticeService } from './attendance-notice.service.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let teacherToken: string;
let adminToken: string;
let parentUserId: string;

let groupId: string;
let lessonId: string;
let studentId: string;

let noticeService: AttendanceNoticeService;
let noticeProcessor: AttendanceNoticeProcessor;

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
  const teacherUserId = await createUserWithRole(db, 'teacher');
  teacherToken = await tokenFor(t, db, teacherUserId, 'teacher');

  noticeService = t.app.get(AttendanceNoticeService);
  noticeProcessor = t.app.get(AttendanceNoticeProcessor);

  // Kurs, xona, guruh
  const courseRes = await call('POST', 'courses', adminToken, {
    name: 'Matematika SAT',
    defaultMonthlyPrice: '800000',
    lessonDurationMin: 90,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const roomRes = await call('POST', 'rooms', adminToken, { name: 'Room 303', capacity: 25 });
  const roomId = roomRes.json<{ id: string }>().id;

  const groupRes = await call('POST', 'groups', adminToken, {
    courseId,
    roomId,
    name: 'SAT-M1',
    maxStudents: 20,
    startDate: '2026-11-01',
    monthlyPrice: '800000',
    teachers: [{ teacherId: teacherUserId, role: 'main' }],
  });
  groupId = groupRes.json<{ id: string }>().id;

  // Ota-ona foydalanuvchisi va o'quvchi
  parentUserId = await createUserWithRole(db, 'guardian', '+998909998877');

  const studentRes = await call('POST', 'students', adminToken, {
    fullName: 'Anvar Qodirov',
    guardians: [{ fullName: 'Vali Qodirov', phone: '+998909998877', relation: 'father' }],
  });
  const sData = studentRes.json<{ id: string; guardians: { guardianId: string }[] }>();
  studentId = sData.id;

  // Guardian'ga userId bog'laymiz
  await db
    .update(guardians)
    .set({ userId: parentUserId })
    .where(eq(guardians.id, sData.guardians[0]!.guardianId));

  // Guruhga yozish
  await call('POST', 'enrollments', adminToken, {
    studentId,
    groupId,
    startDate: '2026-11-01',
  });

  // Bugungi dars yaratamiz
  const [l] = await db
    .insert(lessons)
    .values({
      groupId,
      date: '2026-11-13',
      startTime: '10:00',
      endTime: '11:30',
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

describe('T-113: "Kelmadi/kech qoldi" xabari ota-onaga (FR-ATT-3, BR-31, BR-10)', () => {
  it('1. Davomat saqlanganda Outbox ga AttendanceMarked hodisasi yoziladi', async () => {
    const res = await call('POST', `attendance/lessons/${lessonId}`, teacherToken, {
      items: [{ studentId, status: 'absent' }],
    });
    expect(res.statusCode).toBe(201);

    const events = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.type, 'AttendanceMarked'));

    expect(events.length).toBeGreaterThanOrEqual(1);
    const lastEvent = events[events.length - 1]!;
    expect(lastEvent.payload).toMatchObject({
      lessonId,
      studentId,
      status: 'absent',
    });
  });

  it('2. BR-31 3 daqiqalik oyna oʻtgach, processor ota-onaga "kelmadi" xabarini yuboradi', async () => {
    // 3 daqiqalik oyna o'tdi deb faraz qilib, processor ishga tushiriladi
    await noticeProcessor.process({ lessonId, studentId });

    const notifs = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, parentUserId), eq(notifications.type, 'attendance_absent')),
      );

    expect(notifs.length).toBe(1);
    expect(notifs[0]?.title).toContain('Darsga kelmadi');
    expect(notifs[0]?.body).toContain('Anvar Qodirov');
    expect(notifs[0]?.status).toBe('queued');
  });

  it('3. Qayta saqlanganda dedup ishlaydi (bitta xabar, ikkinchi marta takrorlanmaydi)', async () => {
    // Yana processor ishga tushsa ham, duplicate bo'lmaydi
    await noticeProcessor.process({ lessonId, studentId });

    const notifs = await db
      .select()
      .from(notifications)
      .where(
        and(eq(notifications.userId, parentUserId), eq(notifications.type, 'attendance_absent')),
      );

    expect(notifs.length).toBe(1);
  });

  it('4. BR-31: Xabar ketganidan keyin ustoz davomatni "keldi"ga tuzatsa, tuzatish xabari ketadi', async () => {
    // Ustoz keldi deb tuzatadi
    const res = await call('POST', `attendance/lessons/${lessonId}`, teacherToken, {
      items: [{ studentId, status: 'present' }],
    });
    expect(res.statusCode).toBe(201);

    // Event orqali noticeService tuzatishni qayta ishlaydi
    await noticeService.handleAttendanceMarked({
      lessonId,
      studentId,
      status: 'present',
      lateMinutes: null,
      previousStatus: 'absent',
      markedAt: new Date().toISOString(),
    });

    const correctionNotifs = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, parentUserId),
          eq(notifications.type, 'attendance_correction'),
        ),
      );

    expect(correctionNotifs.length).toBe(1);
    expect(correctionNotifs[0]?.title).toContain('Farzandingiz darsda');
    expect(correctionNotifs[0]?.body).toContain('Uzr, xatolik yuz bergan');
  });

  it('5. BR-31: 3 daqiqalik oyna ichida ustoz "keldi"ga tuzatsa — xabar bekor qilinadi', async () => {
    // Yangi dars yaratamiz
    const [l2] = await db
      .insert(lessons)
      .values({
        groupId,
        date: '2026-11-13',
        startTime: '12:00',
        endTime: '13:30',
        status: 'scheduled',
      })
      .returning();
    const lesson2Id = l2!.id;

    // Ustoz avval kelmadi deb belgiladi
    await call('POST', `attendance/lessons/${lesson2Id}`, teacherToken, {
      items: [{ studentId, status: 'absent' }],
    });

    // Ammo 3 daqiqa o'tmasdan ustoz "keldi"ga tuzatdi
    await call('POST', `attendance/lessons/${lesson2Id}`, teacherToken, {
      items: [{ studentId, status: 'present' }],
    });

    // 3 daqiqalik oyna tugab, processor ishga tushganda:
    await noticeProcessor.process({ lessonId: lesson2Id, studentId });

    // lesson2Id bo'yicha hech qanday xabarnoma ketmasligi kerak!
    const notifs = await db
      .select()
      .from(notifications)
      .where(like(notifications.dedupeKey, `att:${lesson2Id}:%`));

    expect(notifs.length).toBe(0);
  });

  it('6. BR-10: Kechikish < 15 daqiqa boʻlsa xabar yuborilmaydi; >= 15 boʻlsa yuboriladi', async () => {
    const [l3] = await db
      .insert(lessons)
      .values({
        groupId,
        date: '2026-11-13',
        startTime: '14:00',
        endTime: '15:30',
        status: 'scheduled',
      })
      .returning();
    const lesson3Id = l3!.id;

    // 10 daqiqa kechikish (< 15)
    await call('POST', `attendance/lessons/${lesson3Id}`, teacherToken, {
      items: [{ studentId, status: 'late', lateMinutes: 10 }],
    });
    await noticeProcessor.process({ lessonId: lesson3Id, studentId });

    let notifs = await db
      .select()
      .from(notifications)
      .where(like(notifications.dedupeKey, `att:${lesson3Id}:%`));
    expect(notifs.length).toBe(0);

    // 25 daqiqa kechikish (>= 15)
    await call('POST', `attendance/lessons/${lesson3Id}`, teacherToken, {
      items: [{ studentId, status: 'late', lateMinutes: 25 }],
    });
    await noticeProcessor.process({ lessonId: lesson3Id, studentId });

    notifs = await db
      .select()
      .from(notifications)
      .where(like(notifications.dedupeKey, `att:${lesson3Id}:%`));
    expect(notifs.length).toBe(1);
    expect(notifs[0]?.type).toBe('attendance_late');
    expect(notifs[0]?.body).toContain('25 daqiqa kechikib keldi');
  });
});
