import { type RoleCode } from '@lg/contracts';
import {
  auditLogs,
  cashClosings,
  closeDb,
  createDb,
  type Database,
  ledgerEntries,
  receiptCancellations,
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
let testPaymentId: string;
let testReceiptNumber: string;

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

  const [student] = await db
    .insert(students)
    .values({
      fullName: 'Storno Test Oʻquvchi',
      searchName: 'storno test oquvchi',
      birthDate: '2011-05-05',
    })
    .returning();
  testStudentId = student!.id;

  // Dastlabki to'lov kiritamiz
  const payRes = await call('POST', 'billing/payments', 'admin', {
    studentId: testStudentId,
    amount: '30000000',
    method: 'cash',
    paidAt: new Date().toISOString(),
  });
  const payJson = payRes.json<{ id: string; receiptNumber: string }>();
  testPaymentId = payJson.id;
  testReceiptNumber = payJson.receiptNumber;
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Storno, Refund va Kassa Yopish (T-209, FR-PAY-9, 10, BR-16, 17)', () => {
  describe('Storno (Reversal, BR-16)', () => {
    it('ustoz va ota-ona toʻlovni storno qila olmaydi (403)', async () => {
      for (const role of ['teacher', 'guardian'] as const) {
        const res = await call('POST', `billing/payments/${testPaymentId}/reverse`, role, {
          reason: 'Xato kiritilgan',
        });
        expect(res.statusCode).toBe(403);
      }
    });

    it('Admin shu kungi toʻlovni storno qila oladi (201/200)', async () => {
      const res = await call('POST', `billing/payments/${testPaymentId}/reverse`, 'admin', {
        reason: 'Kassir adashib boshqa oʻquvchiga kiritgan',
      });
      expect(res.statusCode).toBe(201);
      const json = res.json<{ paymentId: string; reversalId: string }>();
      expect(json.paymentId).toBe(testPaymentId);
      expect(json.reversalId).toBeTruthy();

      // Chek bekor qilinganligini tekshiramiz
      const cancell = await db.select().from(receiptCancellations);
      expect(cancell.length).toBeGreaterThanOrEqual(1);

      // Ledgerga musbat summa (qarz qaytishi) yozilgan
      const ledgers = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.studentId, testStudentId));
      const revEntry = ledgers.find((l) => l.entryType === 'reversal');
      expect(revEntry).toBeDefined();
      expect(revEntry!.amount).toBe(30000000n);

      // Ommaviy tekshirish sahifasida chek "bekor qilingan" bo'lib ko'rinadi
      const receiptRes = await call('GET', `billing/receipts/${testReceiptNumber}`);
      expect(receiptRes.statusCode).toBe(200);
      expect(receiptRes.json<{ isCancelled: boolean }>().isCancelled).toBe(true);
    });

    it('Allaqachon storno qilingan toʻlovni qayta storno qilib boʻlmaydi (409)', async () => {
      const res = await call('POST', `billing/payments/${testPaymentId}/reverse`, 'admin', {
        reason: 'Qayta urinish',
      });
      expect(res.statusCode).toBe(409);
    });

    it('Kiritilgan kundan keyingi toʻlovni Admin storno qila olmaydi (403), faqat Director (200)', async () => {
      // Kechagi to'lov yaratamiz
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pastPayRes = await call('POST', 'billing/payments', 'admin', {
        studentId: testStudentId,
        amount: '20000000',
        method: 'cash',
        paidAt: yesterday.toISOString(),
      });
      const pastPayId = pastPayRes.json<{ id: string }>().id;

      // Admin urinishi -> 403 (kiritilgan kundan keyingi to'lov)
      const adminRes = await call('POST', `billing/payments/${pastPayId}/reverse`, 'admin', {
        reason: 'Kecha adashilgan',
      });
      expect(adminRes.statusCode).toBe(403);

      // Director urinishi -> 201/200
      const directorRes = await call('POST', `billing/payments/${pastPayId}/reverse`, 'director', {
        reason: 'Direktor tasdiqlagan storno',
      });
      expect(directorRes.statusCode).toBe(201);
    });
  });

  describe('Refund (BR-17)', () => {
    it('Admin/Ustoz/Ota-ona refund qila olmaydi (403)', async () => {
      for (const role of ['admin', 'teacher', 'guardian'] as const) {
        const res = await call('POST', 'billing/payments/refund', role, {
          studentId: testStudentId,
          amount: '10000000',
          method: 'cash',
          reason: 'Ortiqcha pulni qaytarish',
        });
        expect(res.statusCode).toBe(403);
      }
    });

    it('Director refund qila oladi: ledgerga refund yoziladi (201/200)', async () => {
      const res = await call('POST', 'billing/payments/refund', 'director', {
        studentId: testStudentId,
        amount: '10000000',
        method: 'cash',
        reason: 'Oʻqish toʻxtatilgani sababli qoldiq qaytarildi',
      });
      expect(res.statusCode).toBe(201);

      const ledgers = await db
        .select()
        .from(ledgerEntries)
        .where(eq(ledgerEntries.studentId, testStudentId));
      const refEntry = ledgers.find((l) => l.entryType === 'refund');
      expect(refEntry).toBeDefined();
      expect(refEntry!.amount).toBe(10000000n);
    });
  });

  describe('Kunlik Kassa Yopish (FR-PAY-10)', () => {
    const todayStr = new Date().toISOString().slice(0, 10);

    it('Kutilayotgan naqd pul summasi olinadi (200)', async () => {
      const res = await call('GET', `billing/cash/expected?date=${todayStr}`, 'admin');
      expect(res.statusCode).toBe(200);
      expect(res.json<{ date: string; expectedCash: string }>().date).toBe(todayStr);
    });

    it('Farq mavjud boʻlganda izohsiz kassa yopilmaydi (400)', async () => {
      const res = await call('POST', 'billing/cash/close', 'admin', {
        date: todayStr,
        countedCash: '999999999',
      });
      expect(res.statusCode).toBe(400);
    });

    it('Admin yoki Director izoh bilan kassani yopadi (201)', async () => {
      const res = await call('POST', 'billing/cash/close', 'admin', {
        date: todayStr,
        countedCash: '50000000',
        note: 'Kassa sanaldi, farq kassa qoldigʻi bilan mos',
      });
      expect(res.statusCode).toBe(201);
      const json = res.json<{ date: string; countedCash: string }>();
      expect(json.date).toBe(todayStr);
      expect(json.countedCash).toBe('50000000');

      // Bazada mavjudligi tekshiriladi
      const closings = await db.select().from(cashClosings);
      expect(closings.length).toBeGreaterThanOrEqual(1);
    });

    it('Shu sanada kassa allaqachon yopilgan boʻlsa qayta yopib boʻlmaydi (409)', async () => {
      const res = await call('POST', 'billing/cash/close', 'director', {
        date: todayStr,
        countedCash: '50000000',
      });
      expect(res.statusCode).toBe(409);
    });

    it('Kassalar tarixi roʻyxatini olish mumkin (200)', async () => {
      const res = await call('GET', 'billing/cash/closings', 'admin');
      expect(res.statusCode).toBe(200);
      const list = res.json<unknown[]>();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Audit jurnali', () => {
    it('storno, refund va kassa yopish audit logs ga yozilgan', async () => {
      const logs = await db.select().from(auditLogs);
      const actions = logs.map((l) => l.action);
      expect(actions).toContain('billing.payment.reverse');
      expect(actions).toContain('billing.payment.refund');
      expect(actions).toContain('billing.cash.close');
    });
  });
});
