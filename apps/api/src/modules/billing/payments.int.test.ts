import type { PaymentDetail, PublicReceipt, RoleCode, StudentLedgerSummary } from '@lg/contracts';
import { closeDb, createDb, type Database, payments, receipts, seed } from '@lg/db';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId: string;
let receiptNumber: string;

type Method = 'GET' | 'POST';
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

  const courseRes = await call('POST', 'courses', 'admin', {
    name: 'Mental Arithmetic',
    defaultMonthlyPrice: '400000',
    lessonDurationMin: 60,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const groupRes = await call('POST', 'groups', 'admin', {
    courseId,
    name: 'MA-01',
    maxStudents: 10,
    startDate: '2026-10-01',
    monthlyPrice: '400000',
  });
  const groupId = groupRes.json<{ id: string }>().id;

  const studentRes = await call('POST', 'students', 'admin', {
    fullName: 'Shaxzod Aliyev',
    phone: '+998909876543',
  });
  studentId = studentRes.json<{ id: string }>().id;

  await call('POST', 'enrollments', 'admin', {
    studentId,
    groupId,
    startDate: '2026-10-01',
  });

  // Ikki oylik invoice generatsiyasi (2026-10 va 2026-11)
  await call('POST', 'billing/invoices/generate', 'admin', { period: '2026-10' });
  await call('POST', 'billing/invoices/generate', 'admin', { period: '2026-11' });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Payments API (T-204, FR-PAY-2, 6, BR-11, 12, 19)', () => {
  describe('Ruxsatlar va cheklovlar', () => {
    it("tokensiz so'rov 401 UNAUTHORIZED qaytaradi", async () => {
      const res = await call('POST', 'billing/payments', undefined, {
        studentId,
        amount: '200000',
        method: 'cash',
      });
      expect(res.statusCode).toBe(401);
    });

    it("teacher to'lov kirita olmaydi (403 FORBIDDEN)", async () => {
      const res = await call('POST', 'billing/payments', 'teacher', {
        studentId,
        amount: '200000',
        method: 'cash',
      });
      expect(res.statusCode).toBe(403);
    });
  });

  describe("To'lov kiritish va FIFO taqsimlash (BR-12)", () => {
    it("qisman to'lov avval eski invoice qatoriga taqsimlanadi", async () => {
      // 2026-10 oyi 400_000 so'm, 2026-11 oyi 400_000 so'm. 300_000 to'laymiz.
      const res = await call('POST', 'billing/payments', 'admin', {
        studentId,
        amount: '300000',
        method: 'cash',
      });

      expect(res.statusCode).toBe(201);
      const json = res.json<PaymentDetail>();
      expect(json.amount).toBe('300000');
      expect(json.method).toBe('cash');
      expect(json.receiptNumber).toMatch(/^LG-\d{4}-\d{6}$/);
      expect(json.allocations.length).toBe(1);
      expect(json.allocations[0]?.amount).toBe('300000');
      expect(json.advance).toBe('0');
      receiptNumber = json.receiptNumber!;
    });

    it("ikkinchi to'lov qolgan qarzni yopadi va ortig'i avansga o'tadi (BR-12)", async () => {
      // Qolgan qarz: 2026-10 dan 100_000, 2026-11 dan 400_000. Jami 500_000 qarz.
      // Biz 700_000 to'laymiz: 500_000 taqsimlanadi, 200_000 avans bo'ladi.
      const res = await call('POST', 'billing/payments', 'admin', {
        studentId,
        amount: '700000',
        method: 'card',
      });

      expect(res.statusCode).toBe(201);
      const json = res.json<PaymentDetail>();
      expect(json.amount).toBe('700000');
      expect(json.method).toBe('card');
      expect(json.allocations.length).toBe(2);
      expect(json.advance).toBe('200000');

      // Balansni tekshiramiz: endi qarz 0, avans 200_000 so'm
      const summaryRes = await call('GET', `billing/ledger/${studentId}/summary`, 'admin');
      const summary = summaryRes.json<StudentLedgerSummary>();
      expect(summary.totalDebt).toBe('0');
      expect(summary.totalAdvance).toBe('200000');
      expect(summary.balance).toBe('200000'); // musbat = ota-ona avansi
    });
  });

  describe('Chek raqami (BR-19) va ommaviy tekshirish sahifasi', () => {
    it("GET /api/billing/receipts/:number chek ma'lumotlarini qaytaradi (Public 200)", async () => {
      const res = await call('GET', `billing/receipts/${receiptNumber}`);
      expect(res.statusCode).toBe(200);
      const receipt = res.json<PublicReceipt>();
      expect(receipt.number).toBe(receiptNumber);
      expect(receipt.amount).toBe('300000');
      expect(receipt.method).toBe('cash');
      expect(receipt.isCancelled).toBe(false);
      expect(receipt.cancelReason).toBeNull();
    });

    it("mavjud bo'lmagan chek 404 NOT_FOUND qaytaradi", async () => {
      const res = await call('GET', 'billing/receipts/LG-2099-999999');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('DB triggers: payments va receipts faqat INSERT (immutability)', () => {
    it('payments qatorini UPDATE qilish taqiqlanadi', async () => {
      const [p] = await db.select().from(payments).limit(1);
      expect(p).toBeDefined();

      await expect(
        db.execute(sql`UPDATE payments SET amount = 1 WHERE id = ${p!.id}`),
      ).rejects.toThrow();
    });

    it('receipts qatorini DELETE qilish taqiqlanadi', async () => {
      const [r] = await db.select().from(receipts).limit(1);
      expect(r).toBeDefined();

      await expect(db.execute(sql`DELETE FROM receipts WHERE id = ${r!.id}`)).rejects.toThrow();
    });
  });
});
