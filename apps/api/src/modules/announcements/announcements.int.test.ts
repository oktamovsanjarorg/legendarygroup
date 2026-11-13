import type { RoleCode } from '@lg/contracts';
import {
  closeDb,
  courses,
  createDb,
  type Database,
  guardians,
  invoices,
  notifications,
  seed,
  studentGuardians,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

describe('Ommaviy eʼlonlar moduli (T-305 / FR-RPT-5)', () => {
  let t: TestApp;
  let db: Database;
  let tokens: Map<RoleCode, string>;
  let teacher1Id: string;
  let teacher2Id: string;
  let teacher1Token: string;
  let guardianUserId: string;

  let courseId: string;
  let group1Id: string;
  let group2Id: string;
  let student1Id: string;
  let student2Id: string;

  beforeAll(async () => {
    t = await createRealTestApp();
    await seed(t.db.url, { withTestDirector: false });
    db = createDb(t.db.url, { max: 2 });
    tokens = await tokensForAllRoles(t, db);

    teacher1Id = await createUserWithRole(db, 'teacher');
    teacher1Token = await tokenFor(t, db, teacher1Id, 'teacher');

    teacher2Id = await createUserWithRole(db, 'teacher');

    guardianUserId = await createUserWithRole(db, 'guardian', '+998901230001');

    // Kurs va guruhlar
    const [c] = await db
      .insert(courses)
      .values({
        name: 'Ingliz tili IELTS',
        defaultMonthlyPrice: 700000n,
        lessonDurationMin: 80,
      })
      .returning();
    courseId = c!.id;

    // Guruh 1 (teacher1 dars beradi)
    const resG1 = await t.app.inject({
      method: 'POST',
      url: '/api/groups',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: {
        name: 'IELTS-A1',
        courseId,
        maxStudents: 15,
        startDate: '2026-11-01',
        teachers: [{ teacherId: teacher1Id, role: 'main' }],
      },
    });
    group1Id = resG1.json<{ id: string }>().id;

    // Guruh 2 (teacher2 dars beradi)
    const resG2 = await t.app.inject({
      method: 'POST',
      url: '/api/groups',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: {
        name: 'IELTS-B2',
        courseId,
        maxStudents: 15,
        startDate: '2026-11-01',
        teachers: [{ teacherId: teacher2Id, role: 'main' }],
      },
    });
    group2Id = resG2.json<{ id: string }>().id;

    // Talabalar (API orqali)
    const s1Res = await t.app.inject({
      method: 'POST',
      url: '/api/students',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: { fullName: 'Temur Valiyev', phone: '+998901111111' },
    });
    student1Id = s1Res.json<{ id: string }>().id;

    const s2Res = await t.app.inject({
      method: 'POST',
      url: '/api/students',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: { fullName: 'Zilola Aliyeva', phone: '+998902222222' },
    });
    student2Id = s2Res.json<{ id: string }>().id;

    // Ota-ona (Guardian)
    const [g] = await db
      .insert(guardians)
      .values({
        fullName: 'Valiyev Akrom',
        phone: '+998901230001',
        userId: guardianUserId,
      })
      .returning();

    // Talaba 1 ga ota-ona bog'lash
    await db.insert(studentGuardians).values({
      studentId: student1Id,
      guardianId: g!.id,
      relation: 'father',
      isPrimary: true,
      notify: true,
    });

    // Talaba 1 -> Guruh 1
    await t.app.inject({
      method: 'POST',
      url: '/api/enrollments',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: {
        studentId: student1Id,
        groupId: group1Id,
        startDate: '2026-11-01',
      },
    });

    // Talaba 2 -> Guruh 2
    await t.app.inject({
      method: 'POST',
      url: '/api/enrollments',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: {
        studentId: student2Id,
        groupId: group2Id,
        startDate: '2026-11-01',
      },
    });
  });

  afterAll(async () => {
    await closeDb(db);
    await t.close();
  });

  it('Ruxsatlar: ota-ona uchun barcha eʼlon amallari 403', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: `/api/announcements/preview?targetType=all`,
      headers: { authorization: `Bearer ${tokens.get('guardian')}` },
    });
    expect(res.statusCode).toBe(403);
  });

  it('Scope: Teacher faqat oʻz guruhiga preview va eʼlon yuborishi mumkin', async () => {
    // Teacher1 o'zining Group 1 guruhiga preview so'raydi -> 200
    const okPreview = await t.app.inject({
      method: 'GET',
      url: `/api/announcements/preview?targetType=group&targetId=${group1Id}`,
      headers: { authorization: `Bearer ${teacher1Token}` },
    });
    expect(okPreview.statusCode).toBe(200);
    const body = okPreview.json<{ recipientCount: number }>();
    expect(body.recipientCount).toBe(1);

    // Teacher1 boshqa guruhga (Group 2) preview so'raydi -> 403
    const badGroup = await t.app.inject({
      method: 'GET',
      url: `/api/announcements/preview?targetType=group&targetId=${group2Id}`,
      headers: { authorization: `Bearer ${teacher1Token}` },
    });
    expect(badGroup.statusCode).toBe(403);

    // Teacher1 butun markazga (all) so'raydi -> 403
    const badAll = await t.app.inject({
      method: 'GET',
      url: `/api/announcements/preview?targetType=all`,
      headers: { authorization: `Bearer ${teacher1Token}` },
    });
    expect(badAll.statusCode).toBe(403);
  });

  it('Preview: Admin butun markaz yoki guruh auditoriyasini koʻradi', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: `/api/announcements/preview?targetType=group&targetId=${group1Id}`,
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json<{ recipientCount: number; sampleRecipients: Array<unknown> }>();
    expect(data.recipientCount).toBe(1);
    expect(data.sampleRecipients.length).toBe(1);
  });

  it('Yaratish va tarqatish: Admin guruhga eʼlon yuboradi (notifications yaratiladi)', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/announcements',
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
      payload: {
        title: 'Ertaga ochiq dars',
        body: 'Hurmatli ota-onalar, ertaga soat 15:00 da ochiq dars boʻlib oʻtadi.',
        targetType: 'group',
        targetId: group1Id,
        sendNow: true,
      },
    });

    expect(res.statusCode).toBe(201);
    const ann = res.json<{
      id: string;
      status: string;
      totalRecipients: number;
      sentCount: number;
    }>();
    expect(ann.status).toBe('completed');
    expect(ann.totalRecipients).toBe(1);
    expect(ann.sentCount).toBe(1);

    // Notifications jadvalida yozuv borligini tekshiramiz
    const notifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.type, 'announcement'));
    expect(notifs.length).toBeGreaterThan(0);
    expect(notifs.some((n) => n.title === 'Ertaga ochiq dars')).toBe(true);

    // Statistika endpointini tekshiramiz
    const statsRes = await t.app.inject({
      method: 'GET',
      url: `/api/announcements/${ann.id}/stats`,
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
    });
    expect(statsRes.statusCode).toBe(200);
    const stats = statsRes.json<{
      totalRecipients: number;
      sentCount: number;
      recipients: Array<{ status: string }>;
    }>();
    expect(stats.totalRecipients).toBe(1);
    expect(stats.sentCount).toBe(1);
    expect(stats.recipients[0]?.status).toBe('sent');
  });

  it('Qarzdorlar auditoriyasi: qarzdor ota-onaga eʼlon yuborish', async () => {
    // Student 1 uchun ochiq invoice yaratamiz
    await db.insert(invoices).values({
      studentId: student1Id,
      period: '2026-11',
      status: 'open',
      total: 700000n,
      dueDate: '2026-11-10',
    });

    const previewRes = await t.app.inject({
      method: 'GET',
      url: `/api/announcements/preview?targetType=debtors`,
      headers: { authorization: `Bearer ${tokens.get('admin')}` },
    });
    expect(previewRes.statusCode).toBe(200);
    expect(previewRes.json<{ recipientCount: number }>().recipientCount).toBe(1);

    const sendRes = await t.app.inject({
      method: 'POST',
      url: '/api/announcements',
      headers: { authorization: `Bearer ${tokens.get('director')}` },
      payload: {
        title: 'Toʻlov muddati eslatmasi',
        body: 'Iltimos, oʻqish toʻlovini oʻz vaqtida amalga oshiring.',
        targetType: 'debtors',
        sendNow: true,
      },
    });
    expect(sendRes.statusCode).toBe(201);
    expect(sendRes.json<{ sentCount: number }>().sentCount).toBe(1);
  });
});
