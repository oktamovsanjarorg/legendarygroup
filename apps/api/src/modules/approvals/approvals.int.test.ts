import { type EventPayloads, type RoleCode } from '@lg/contracts';
import {
  approvalRequests,
  attendance,
  auditLogs,
  closeDb,
  createDb,
  type Database,
  lessons,
  notifications,
  outboxEvents,
  seed,
} from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { EventHandlers } from '../outbox/index.js';

/** T-119, 02 §5: so'rov → Director qarori → amal bajariladi (yoki rad). */
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
const f = { student: '', enrollment: '', payment: '', receipt: '', lesson: '' };
const today = formatDateToYmd(new Date());

type Method = 'GET' | 'POST';
const call = (method: Method, url: string, role?: RoleCode, payload?: object) => {
  // BR-11: Idempotency-Key — faqat sarlavhada.
  const { idempotencyKey, ...rest } = (payload ?? {}) as Record<string, unknown>;
  const headers: Record<string, string> = role
    ? { authorization: `Bearer ${tokens.get(role)!}` }
    : {};
  if (typeof idempotencyKey === 'string') headers['idempotency-key'] = idempotencyKey;
  return t.app.inject({ method, url: `/api/${url}`, payload: payload ? rest : undefined, headers });
};
const idOf = async (url: string, body: object) =>
  (await call('POST', url, 'admin', body)).json<{ id: string }>().id;

const request = async (type: string, payload: object) =>
  (await call('POST', 'approvals', 'admin', { type, payload, reason: 'Sabab bilan soʻrov' })).json<{
    id: string;
    status: string;
  }>();
const approve = (id: string) =>
  call('POST', `approvals/${id}/decide`, 'director', { decision: 'approve', note: 'Tasdiq' });
const statusOf = async (id: string) =>
  (await call('GET', `approvals/${id}`, 'admin')).json<{ status: string }>().status;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const start = addDays(today, -40);
  const course = await idOf('courses', {
    name: 'Matem',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 60,
  });
  const group = await idOf('groups', {
    courseId: course,
    name: 'M-1',
    maxStudents: 10,
    startDate: start,
  });
  f.student = await idOf('students', { fullName: 'Ali Valiyev' });
  f.enrollment = await idOf('enrollments', {
    studentId: f.student,
    groupId: group,
    startDate: start,
  });
  // Kecha kiritilgan to'lov (Admin storno qila olmaydi — BR-16) va avans (refund uchun).
  const paid = await call('POST', 'billing/payments', 'admin', {
    studentId: f.student,
    amount: '2000000',
    method: 'cash',
    paidAt: new Date(Date.now() - 86_400_000).toISOString(),
    idempotencyKey: 'appr-init-pay-1',
  });
  const p = paid.json<{ id: string; receiptNumber: string }>();
  f.payment = p.id;
  f.receipt = p.receiptNumber;
  // O'tgan oy darsi (davomati bor) — Admin/Ustoz o'zgartira olmaydi.
  const [lesson] = await db
    .insert(lessons)
    .values({ groupId: group, date: addDays(today, -35), startTime: '15:00', endTime: '16:00' })
    .returning();
  f.lesson = lesson!.id;
  const teacher = await createUserWithRole(db, 'teacher');
  await db
    .insert(attendance)
    .values({ lessonId: f.lesson, studentId: f.student, status: 'present', markedBy: teacher });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Approvals API (T-119, 02 §5)', () => {
  it('RBAC: ustoz/ota-ona soʻrov yarata olmaydi; qaror — faqat Director', async () => {
    for (const role of ['teacher', 'guardian'] as const) {
      const res = await call('POST', 'approvals', role, {
        type: 'reversal',
        payload: { paymentId: f.payment, reason: 'Xato' },
        reason: 'Storno soʻrovi',
      });
      expect(res.statusCode).toBe(403);
    }
    const r = await request('reversal', { paymentId: f.payment, reason: 'Kassa xatosi' });
    for (const role of ['admin', 'teacher', 'guardian'] as const)
      expect(
        (await call('POST', `approvals/${r.id}/decide`, role, { decision: 'approve' })).statusCode,
      ).toBe(403);
    expect(await statusOf(r.id)).toBe('pending');
  });

  it('chegirma (BR-18): tasdiqlansa enrollment’ga qoʻyiladi', async () => {
    const r = await request('discount', {
      enrollmentId: f.enrollment,
      percent: 50,
      reason: 'Olimpiada',
    });
    expect(r.status).toBe('pending');
    const res = await approve(r.id);
    expect(res.statusCode).toBe(201);
    expect(res.json<{ status: string }>().status).toBe('approved');
    const enr = (await call('GET', `students/${f.student}/enrollments`, 'admin')).json<
      { id: string; discountPercent: number | null }[]
    >();
    expect(enr.find((e) => e.id === f.enrollment)?.discountPercent).toBe(50);
  });

  it('davomat (BR-30): oʻtgan oy belgisi oʻzgaradi', async () => {
    const r = await request('attendance_edit', {
      lessonId: f.lesson,
      studentId: f.student,
      status: 'absent',
      reason: 'Jurnalda xato',
    });
    expect((await approve(r.id)).statusCode).toBe(201);
    const [row] = await db.select().from(attendance).where(eq(attendance.lessonId, f.lesson));
    expect(row?.status).toBe('absent');
  });

  it('refund (BR-17): avansdan qaytariladi', async () => {
    const before = (await call('GET', `billing/ledger/${f.student}/summary`, 'admin')).json<{
      totalAdvance: string;
    }>();
    const r = await request('refund', {
      studentId: f.student,
      amount: '100000',
      method: 'cash',
      reason: 'Qaytarish',
    });
    expect((await approve(r.id)).statusCode).toBe(201);
    const after = (await call('GET', `billing/ledger/${f.student}/summary`, 'admin')).json<{
      totalAdvance: string;
    }>();
    expect(BigInt(before.totalAdvance) - BigInt(after.totalAdvance)).toBe(100_000n);
  });

  it('storno (BR-16): kechagi toʻlov bekor qilinadi; qayta qaror — 409', async () => {
    const r = await request('reversal', { paymentId: f.payment, reason: 'Kassa xatosi' });
    expect((await approve(r.id)).statusCode).toBe(201);
    const receipt = (await call('GET', `billing/receipts/${f.receipt}`, 'admin')).json<{
      isCancelled: boolean;
    }>();
    expect(receipt.isCancelled).toBe(true);
    expect(
      (await call('POST', `approvals/${r.id}/decide`, 'director', { decision: 'reject' }))
        .statusCode,
    ).toBe(409);
  });

  it('amal bajarilmasa (toʻlov yoʻq) — xato, soʻrov "kutilmoqda" qoladi', async () => {
    const r = await request('reversal', {
      paymentId: '22222222-2222-4222-8222-222222222222',
      reason: 'Xato',
    });
    expect((await approve(r.id)).statusCode).toBe(404);
    expect(await statusOf(r.id)).toBe('pending');
  });

  it('rad etish — amal bajarilmaydi; 48 soatdan keyin — 409', async () => {
    const r = await request('discount', {
      enrollmentId: f.enrollment,
      percent: 90,
      reason: 'Katta',
    });
    const res = await call('POST', `approvals/${r.id}/decide`, 'director', {
      decision: 'reject',
      note: 'Yoʻq',
    });
    expect(res.json<{ status: string }>().status).toBe('rejected');
    const enr = (await call('GET', `students/${f.student}/enrollments`, 'admin')).json<
      { discountPercent: number | null }[]
    >();
    expect(enr[0]?.discountPercent).toBe(50);

    const old = await request('discount', {
      enrollmentId: f.enrollment,
      percent: 30,
      reason: 'Eski',
    });
    await db
      .update(approvalRequests)
      .set({ expiresAt: new Date(Date.now() - 1000) })
      .where(eq(approvalRequests.id, old.id));
    expect((await approve(old.id)).statusCode).toBe(409);
  });

  it('yaratish va qaror audit_logs’da', async () => {
    const logs = await db.select().from(auditLogs).where(eq(auditLogs.entity, 'approval_request'));
    const actions = logs.map((l) => l.action);
    expect(actions).toContain('approval.create');
    expect(actions).toContain('approval.decide');
  });

  it('T-119: qaror soʻrovchiga xabar boʻlib boradi (ApprovalDecided → approval_decided)', async () => {
    const r = await request('discount', {
      enrollmentId: f.enrollment,
      percent: 70,
      reason: 'Oila',
    });
    await call('POST', `approvals/${r.id}/decide`, 'director', {
      decision: 'reject',
      note: 'Limit',
    });
    const events = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.type, 'ApprovalDecided'));
    const mine = events.find((e) => (e.payload as { requestId: string }).requestId === r.id)!;
    await t.app.get(EventHandlers).dispatch({
      eventId: mine.id,
      type: 'ApprovalDecided',
      payload: mine.payload as EventPayloads['ApprovalDecided'],
      occurredAt: new Date().toISOString(),
    });
    const [req] = await db.select().from(approvalRequests).where(eq(approvalRequests.id, r.id));
    const sent = await db
      .select()
      .from(notifications)
      .where(eq(notifications.dedupeKey, `approval-decided-${r.id}`));
    expect(sent.map((n) => [n.userId, n.type])).toEqual([[req!.requestedBy, 'approval_decided']]);
    expect(sent[0]?.title).toBe('Soʻrovingiz rad etildi');
    expect(sent[0]?.body).toContain('Limit');
  });
});
