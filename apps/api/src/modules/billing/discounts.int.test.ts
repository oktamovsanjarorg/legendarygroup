import { type RoleCode } from '@lg/contracts';
import {
  auditLogs,
  closeDb,
  createDb,
  type Database,
  enrollments,
  invoiceLines,
  invoices,
  ledgerEntries,
  seed,
  students,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let testStudentId: string;
let testEnrollmentId: string;
let testInvoiceId: string;
let testPenaltyLineId: string;
let testTuitionLineId: string;

type Method = 'GET' | 'POST' | 'PATCH';
const call = (method: Method, url: string, role?: RoleCode, payload?: object) => {
  const headers: Record<string, string> = {};
  if (role) {
    headers['authorization'] = `Bearer ${tokens.get(role)!}`;
  }
  return t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers,
  });
};

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);

  const [student] = await db
    .insert(students)
    .values({
      fullName: 'Chegirma Test Oʻquvchi',
      searchName: 'chegirma test oquvchi',
      birthDate: '2010-01-01',
    })
    .returning();
  testStudentId = student!.id;

  const courseRes = await call('POST', 'courses', 'admin', {
    name: 'General English',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 80,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const groupRes = await call('POST', 'groups', 'admin', {
    courseId,
    name: 'GE-101',
    maxStudents: 12,
    startDate: '2026-11-01',
    monthlyPrice: '500000',
  });
  const groupId = groupRes.json<{ id: string }>().id;

  const [enrollment] = await db
    .insert(enrollments)
    .values({
      studentId: testStudentId,
      groupId,
      startDate: '2026-11-01',
    })
    .returning();
  testEnrollmentId = enrollment!.id;

  const [inv] = await db
    .insert(invoices)
    .values({
      studentId: testStudentId,
      period: '2026-11',
      dueDate: '2026-11-10',
      total: 60000000n,
      status: 'open',
    })
    .returning();
  testInvoiceId = inv!.id;

  const [tuitionLine] = await db
    .insert(invoiceLines)
    .values({
      invoiceId: testInvoiceId,
      enrollmentId: testEnrollmentId,
      kind: 'tuition',
      amount: 50000000n,
      description: 'Oylik toʻlov',
    })
    .returning();
  testTuitionLineId = tuitionLine!.id;

  const [penaltyLine] = await db
    .insert(invoiceLines)
    .values({
      invoiceId: testInvoiceId,
      enrollmentId: testEnrollmentId,
      kind: 'penalty',
      amount: 10000000n,
      description: 'Kechikish jarimasi',
    })
    .returning();
  testPenaltyLineId = penaltyLine!.id;

  await db.insert(ledgerEntries).values({
    studentId: testStudentId,
    entryType: 'invoice',
    amount: 60000000n,
    refTable: 'invoices',
    refId: testInvoiceId,
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Discounts & Penalties API (T-203, BR-8, BR-18)', () => {
  describe('Chegirma belgilash (BR-18)', () => {
    it('ustoz va ota-ona chegirma belgilay olmaydi (403)', async () => {
      for (const role of ['teacher', 'guardian'] as const) {
        const res = await call('PATCH', `billing/enrollments/${testEnrollmentId}/discount`, role, {
          percent: 10,
          reason: 'Yaxshi oʻqishi',
        });
        expect(res.statusCode).toBe(403);
      }
    });

    it('Admin limit doirasida (≤ 10%) chegirma bera oladi (200)', async () => {
      const res = await call('PATCH', `billing/enrollments/${testEnrollmentId}/discount`, 'admin', {
        percent: 10,
        reason: 'Iqtidorli oʻquvchi',
      });
      expect(res.statusCode).toBe(200);
      expect(res.json<{ discountPercent: number }>().discountPercent).toBe(10);
    });

    it('Admin limitdan yuqori (> 10%) chegirma bersa taqiqlanadi (403)', async () => {
      const res = await call('PATCH', `billing/enrollments/${testEnrollmentId}/discount`, 'admin', {
        percent: 20,
        reason: 'Olimpiada gʻolibi',
      });
      expect(res.statusCode).toBe(403);
    });

    it('Director limitdan yuqori (> 10%) chegirma bera oladi (200)', async () => {
      const res = await call(
        'PATCH',
        `billing/enrollments/${testEnrollmentId}/discount`,
        'director',
        { percent: 30, reason: 'Direktor maxsus chegirmasi' },
      );
      expect(res.statusCode).toBe(200);
      expect(res.json<{ discountPercent: number }>().discountPercent).toBe(30);
    });
  });

  describe('Jarimani bekor qilish (waive penalty, BR-8)', () => {
    it('ustoz va ota-ona jarimani bekor qila olmaydi (403)', async () => {
      for (const role of ['teacher', 'guardian'] as const) {
        const res = await call(
          'POST',
          `billing/invoices/${testInvoiceId}/lines/${testPenaltyLineId}/waive`,
          role,
          { reason: 'Sababli' },
        );
        expect(res.statusCode).toBe(403);
      }
    });

    it('tuition qatorini waive qilib boʻlmaydi (400 BAD_REQUEST)', async () => {
      const res = await call(
        'POST',
        `billing/invoices/${testInvoiceId}/lines/${testTuitionLineId}/waive`,
        'admin',
        { reason: 'Xato urinish' },
      );
      expect(res.statusCode).toBe(400);
    });

    it('Admin jarima qatorini bekor qiladi: invoice kamayadi va ledger yoziladi (201/200)', async () => {
      const res = await call(
        'POST',
        `billing/invoices/${testInvoiceId}/lines/${testPenaltyLineId}/waive`,
        'admin',
        { reason: 'Shifokor maʼlumotnomasi taqdim etildi' },
      );
      expect(res.statusCode).toBe(201);
      expect(res.json<{ newTotal: string }>().newTotal).toBe('50000000');

      // Bazada invoice total tekshiriladi
      const [inv] = await db.select().from(invoices).where(eq(invoices.id, testInvoiceId));
      expect(inv!.total).toBe(50000000n);

      // Ledgerga kamayish tushganligi tekshiriladi
      const entries = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.studentId, testStudentId));
      const discountEntry = entries.find((e) => e.entryType === 'discount');
      expect(discountEntry).toBeDefined();
      expect(discountEntry!.amount).toBe(-10000000n);
    });
  });

  describe('Audit jurnali', () => {
    it('chegirma va jarima bekor qilish audit logs ga yozilgan', async () => {
      const logs = await db.select().from(auditLogs);
      const discountLog = logs.find((l) => l.action === 'billing.discount.set');
      const waiveLog = logs.find((l) => l.action === 'billing.penalty.waive');
      expect(discountLog).toBeDefined();
      expect(waiveLog).toBeDefined();
    });
  });
});
