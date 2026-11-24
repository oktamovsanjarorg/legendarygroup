import {
  closeDb,
  courses,
  createDb,
  type Database,
  files,
  groupTeachers,
  guardians,
  notifications,
  seed,
  studentGuardians,
  students,
  users,
} from '@lg/db';
import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { dispatchEvents } from '../../test/dispatch-event.js';
import { createUserWithRole, tokenFor } from '../../test/role-tokens.js';
import { NotificationsService } from '../notifications/index.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let groupId: string;
let adminId: string;
const token: Record<'admin' | 'main' | 'assistant' | 'former', string> = {
  admin: '',
  main: '',
  assistant: '',
  former: '',
};

const call = (method: 'GET' | 'POST', url: string, who: keyof typeof token, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token[who]}` },
  });

async function studentWithGuardian(name: string, phone: string, start: string) {
  const s = await call('POST', 'students', 'admin', { fullName: name });
  const studentId = s.json<{ id: string }>().id;
  const userId = await createUserWithRole(db, 'guardian', phone);
  await db
    .update(users)
    .set({ telegramId: BigInt(phone.slice(1)) })
    .where(eq(users.id, userId));
  const [g] = await db
    .insert(guardians)
    .values({ fullName: `${name} otasi`, phone, userId })
    .returning();
  await db
    .insert(studentGuardians)
    .values({ studentId, guardianId: g!.id, relation: 'father', isPrimary: true, notify: true });
  await call('POST', 'enrollments', 'admin', { studentId, groupId, startDate: start });
  return studentId;
}

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 3 });
  adminId = await createUserWithRole(db, 'admin');
  const [main, assistant, former] = [
    await createUserWithRole(db, 'teacher'),
    await createUserWithRole(db, 'teacher'),
    await createUserWithRole(db, 'teacher'),
  ];
  token.admin = await tokenFor(t, db, adminId, 'admin');
  token.main = await tokenFor(t, db, main, 'teacher');
  token.assistant = await tokenFor(t, db, assistant, 'teacher');
  token.former = await tokenFor(t, db, former, 'teacher');
  const [c] = await db
    .insert(courses)
    .values({ name: 'Ingliz', defaultMonthlyPrice: 700000n, lessonDurationMin: 80 })
    .returning();
  const g = await call('POST', 'groups', 'admin', {
    name: 'A1',
    courseId: c!.id,
    maxStudents: 15,
    startDate: '2026-01-01',
    teachers: [
      { teacherId: main, role: 'main' },
      { teacherId: assistant, role: 'assistant' },
    ],
  });
  groupId = g.json<{ id: string }>().id;
  await db.insert(groupTeachers).values({
    groupId,
    teacherId: former,
    role: 'main',
    fromDate: '2025-01-01',
    toDate: '2025-12-31',
  });
  await studentWithGuardian('Ali Valiyev', '+998901230001', '2026-01-01');
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

const body = (title: string) => ({
  title,
  body: 'Ertaga dars 15:00 da boshlanadi.',
  targetType: 'group',
  targetId: groupId,
});

describe('Eʼlon mantigʻi (T-139, FR-RPT-5)', () => {
  it('Q-62: yordamchi va sobiq asosiy ustoz yubora olmaydi', async () => {
    expect((await call('POST', 'announcements', 'assistant', body('Dars'))).statusCode).toBe(403);
    expect((await call('POST', 'announcements', 'former', body('Dars'))).statusCode).toBe(403);
    expect((await call('POST', 'announcements', 'main', body('Ustozdan'))).statusCode).toBe(201);
  });

  it('ikki marta bosilsa — bitta eʼlon va har ota-onaga bitta xabar', async () => {
    const [a, b] = await Promise.all([
      call('POST', 'announcements', 'admin', body('Ochiq dars')),
      call('POST', 'announcements', 'admin', body('Ochiq dars')),
    ]);
    expect(a.json<{ id: string }>().id).toBe(b.json<{ id: string }>().id);
    await dispatchEvents(t, db, 'AnnouncementCreated');
    await dispatchEvents(t, db, 'AnnouncementCreated');
    const sent = await db
      .select()
      .from(notifications)
      .where(and(eq(notifications.type, 'announcement'), eq(notifications.title, 'Ochiq dars')));
    expect(sent).toHaveLength(1);
    // Telegram qabul qilgach — roʻyxatdagi hisob haqiqiy.
    await t.app.get(NotificationsService).markSent(sent[0]!.id);
    const item = (await call('GET', `announcements/${a.json<{ id: string }>().id}`, 'admin')).json<{
      sentCount: number;
      status: string;
    }>();
    expect(item).toMatchObject({ sentCount: 1, status: 'completed' });
  });

  it('ustoz roʻyxati sahifalashdan oldin filtrlanadi', async () => {
    const res = await call('GET', 'announcements?limit=1', 'main');
    expect(res.json<{ items: { title: string }[] }>().items.map((i) => i.title)).toEqual([
      'Ustozdan',
    ]);
  });

  it('arxivdagi oʻquvchi ota-onasiga yuborilmaydi', async () => {
    const id = await studentWithGuardian('Arxiv Bola', '+998901230002', '2026-01-01');
    await db.update(students).set({ archivedAt: new Date() }).where(eq(students.id, id));
    const res = await call(
      'GET',
      `announcements/preview?targetType=group&targetId=${groupId}`,
      'admin',
    );
    expect(res.json<{ recipientCount: number }>().recipientCount).toBe(1);
  });

  it('fayl: oʻz eʼlon fayli biriktiriladi, boshqa maqsad yoki egasi — 400', async () => {
    const file = async (purpose: string, uploadedBy: string | null) => {
      const [f] = await db
        .insert(files)
        .values({
          s3Key: `files/${purpose}-${String(uploadedBy)}`,
          mime: 'application/pdf',
          size: 10,
          sha256: 'a'.repeat(64),
          purpose,
          uploadedBy,
        })
        .returning();
      return f!.id;
    };
    const bad = { ...body('Fayl'), fileId: await file('payment_receipt', adminId) };
    expect((await call('POST', 'announcements', 'admin', bad)).statusCode).toBe(400);
    const alien = { ...body('Fayl'), fileId: await file('announcement', null) };
    expect((await call('POST', 'announcements', 'admin', alien)).statusCode).toBe(400);
    const ok = await call('POST', 'announcements', 'admin', {
      ...body('Fayl'),
      fileId: await file('announcement', adminId),
    });
    expect(ok.json<{ fileType: string }>().fileType).toBe('document');
  });
});
