import type { RoleCode } from '@lg/contracts';
import {
  closeDb,
  courses,
  createDb,
  type Database,
  guardians,
  lessons,
  notifications,
  seed,
  studentGuardians,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

describe('Murojaatlar va sababli xabarnoma (T-306 / FR-RPT-7, FR-ATT-7)', () => {
  let t: TestApp;
  let db: Database;
  let tokens: Map<RoleCode, string>;
  let guardian1UserId: string;
  let guardian2UserId: string;
  let guardian1Token: string;
  let guardian2Token: string;
  let teacherUserId: string;
  let teacherToken: string;

  let student1Id: string;
  let student2Id: string;
  let groupId: string;
  let lessonId: string;

  beforeAll(async () => {
    t = await createRealTestApp();
    await seed(t.db.url, { withTestDirector: false });
    db = createDb(t.db.url, { max: 2 });
    tokens = await tokensForAllRoles(t, db);

    teacherUserId = await createUserWithRole(db, 'teacher');
    teacherToken = await tokenFor(t, db, teacherUserId, 'teacher');

    guardian1UserId = await createUserWithRole(db, 'guardian', '+998905550001');
    guardian1Token = await tokenFor(t, db, guardian1UserId, 'guardian');

    guardian2UserId = await createUserWithRole(db, 'guardian', '+998905550002');
    guardian2Token = await tokenFor(t, db, guardian2UserId, 'guardian');

    // Kurs va guruh
    const [c] = await db
      .insert(courses)
      .values({
        name: 'Matematika',
        defaultMonthlyPrice: 500000n,
        lessonDurationMin: 60,
      })
      .returning();

    const resG = await t.app.inject({
      method: 'POST',
      url: '/api/groups',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: {
        name: 'Algebra-1',
        courseId: c!.id,
        maxStudents: 10,
        startDate: '2026-11-01',
        teachers: [{ teacherId: teacherUserId, role: 'main' }],
      },
    });
    groupId = resG.json<{ id: string }>().id;

    // Talabalar
    const resS1 = await t.app.inject({
      method: 'POST',
      url: '/api/students',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: { fullName: 'Farrux Rustamov', phone: '+998901112233' },
    });
    student1Id = resS1.json<{ id: string }>().id;

    const resS2 = await t.app.inject({
      method: 'POST',
      url: '/api/students',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: { fullName: 'Malika Rustamova', phone: '+998902223344' },
    });
    student2Id = resS2.json<{ id: string }>().id;

    // Guardian 1 -> Student 1
    const [g1] = await db
      .insert(guardians)
      .values({
        fullName: 'Rustamov Ota',
        phone: '+998905550001',
        userId: guardian1UserId,
      })
      .returning();

    await db.insert(studentGuardians).values({
      studentId: student1Id,
      guardianId: g1!.id,
      relation: 'father',
      isPrimary: true,
      notify: true,
    });

    // Enrollment
    await t.app.inject({
      method: 'POST',
      url: '/api/enrollments',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: {
        studentId: student1Id,
        groupId,
        startDate: '2026-11-01',
      },
    });

    // Dars yaratamiz
    const [les] = await db
      .insert(lessons)
      .values({
        groupId,
        date: '2026-11-20',
        startTime: '10:00',
        endTime: '11:00',
        status: 'scheduled',
      })
      .returning();
    lessonId = les!.id;
  });

  afterAll(async () => {
    await closeDb(db);
    await t.close();
  });

  describe('Support Tickets (FR-RPT-7)', () => {
    let createdTicketId: string;

    it('Ota-ona oʻz farzandi boʻyicha yangi ticket ochadi', async () => {
      const res = await t.app.inject({
        method: 'POST',
        url: '/api/tickets',
        headers: { authorization: `Bearer ${guardian1Token}` },
        payload: {
          studentId: student1Id,
          subject: 'Dars vaqti haqida savol',
          message: 'Dars vaqtini 15 daqiqa surish imkoni bormi?',
          priority: 'normal',
        },
      });

      expect(res.statusCode).toBe(201);
      const ticket = res.json<{
        id: string;
        subject: string;
        status: string;
        messages: Array<{ text: string }>;
      }>();
      expect(ticket.subject).toBe('Dars vaqti haqida savol');
      expect(ticket.status).toBe('open');
      expect(ticket.messages.length).toBe(1);
      expect(ticket.messages[0]?.text).toContain('Dars vaqtini');
      createdTicketId = ticket.id;
    });

    it('Ota-ona boshqa birovning farzandi uchun ticket ocha olmaydi (403)', async () => {
      const res = await t.app.inject({
        method: 'POST',
        url: '/api/tickets',
        headers: { authorization: `Bearer ${guardian1Token}` },
        payload: {
          studentId: student2Id,
          subject: 'Begona talaba',
          message: 'Bu menga tegishli emas',
        },
      });
      expect(res.statusCode).toBe(403);
    });

    it('Boshqa ota-ona (Guardian 2) begona ticketni koʻra olmaydi (404 — mavjudligi oshkor emas)', async () => {
      const res = await t.app.inject({
        method: 'GET',
        url: `/api/tickets/${createdTicketId}`,
        headers: { authorization: `Bearer ${guardian2Token}` },
      });
      expect(res.statusCode).toBe(404);
    });

    it('Ustoz murojaatlarga kira olmaydi (ticket.create ham, ticket.handle ham yoʻq) — 403', async () => {
      const id = createdTicketId;
      const calls: ['GET' | 'POST' | 'PATCH', string, object?][] = [
        ['GET', '/api/tickets'],
        ['GET', `/api/tickets/${id}`],
        ['POST', '/api/tickets', { subject: 'Savol', message: 'Matn matni' }],
        ['POST', `/api/tickets/${id}/messages`, { text: 'Javob' }],
        ['PATCH', `/api/tickets/${id}`, { status: 'closed' }],
      ];
      for (const [method, url, payload] of calls) {
        const res = await t.app.inject({
          method,
          url,
          payload,
          headers: { authorization: `Bearer ${teacherToken}` },
        });
        expect(res.statusCode, `${method} ${url}`).toBe(403);
      }
    });

    it('Admin javob yozadi va ota-onaga bildirishnoma boradi', async () => {
      const res = await t.app.inject({
        method: 'POST',
        url: `/api/tickets/${createdTicketId}/messages`,
        headers: { authorization: `Bearer ${tokens.get('admin')}` },
        payload: {
          text: 'Assalomu alaykum! Ha, dars vaqtini oʻzgartirish boʻyicha koʻrib chiqamiz.',
        },
      });

      expect(res.statusCode).toBe(201);

      // Bildirishnoma bazaga tushganini tekshiramiz
      const notifs = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, guardian1UserId));
      expect(notifs.length).toBeGreaterThan(0);
      expect(notifs.some((n) => n.title?.includes('Murojaatingizga javob'))).toBe(true);
    });

    it('Admin ticket holatini "resolved" ga oʻzgartiradi', async () => {
      const res = await t.app.inject({
        method: 'PATCH',
        url: `/api/tickets/${createdTicketId}`,
        headers: { authorization: `Bearer ${tokens.get('admin')}` },
        payload: {
          status: 'resolved',
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json<{ status: string }>().status).toBe('resolved');
    });
  });

  describe('Sababli kelolmaslik xabarnomasi (FR-ATT-7)', () => {
    it('Ota-ona kelajakdagi darsga oldindan "sababli" xabarnoma yuboradi', async () => {
      const res = await t.app.inject({
        method: 'POST',
        url: '/api/attendance/absence-notices',
        headers: { authorization: `Bearer ${guardian1Token}` },
        payload: {
          studentId: student1Id,
          date: '2026-11-20',
          reason: 'Shifokor koʻrigiga borishi kerak',
        },
      });

      expect(res.statusCode).toBe(201);
      const notice = res.json<{
        id: string;
        date: string;
        reason: string;
        status: string;
      }>();
      expect(notice.date).toBe('2026-11-20');
      expect(notice.reason).toBe('Shifokor koʻrigiga borishi kerak');
      expect(notice.status).toBe('pending');
    });

    it('Ustoz dars davomatini ochganda kutilayotgan oʻquvchida sababli izoh koʻrinadi (FR-ATT-7)', async () => {
      const res = await t.app.inject({
        method: 'GET',
        url: `/api/attendance/lessons/${lessonId}`,
        headers: { authorization: `Bearer ${teacherToken}` },
      });

      expect(res.statusCode).toBe(200);
      const lessonAtt = res.json<{
        expectedStudents: Array<{ id: string; advanceAbsenceReason: string | null }>;
      }>();

      const studentInList = lessonAtt.expectedStudents.find((s) => s.id === student1Id);
      expect(studentInList).toBeDefined();
      expect(studentInList?.advanceAbsenceReason).toBe('Shifokor koʻrigiga borishi kerak');
    });

    it('Sababli xabarlar roʻyxati olinadi', async () => {
      const res = await t.app.inject({
        method: 'GET',
        url: '/api/attendance/absence-notices',
        headers: { authorization: `Bearer ${tokens.get('admin')}` },
      });
      expect(res.statusCode).toBe(200);
      const list = res.json<{ items: Array<{ reason: string }> }>();
      expect(list.items.length).toBeGreaterThan(0);
      expect(list.items.some((i) => i.reason.includes('Shifokor'))).toBe(true);
    });
  });
});
