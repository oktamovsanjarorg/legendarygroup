import { type RoleCode } from '@lg/contracts';
import {
  auditLogs,
  cashClosings,
  closeDb,
  createDb,
  type Database,
  ledgerEntries,
  payments,
  receiptCancellations,
  seed,
  students,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { formatDateToYmd } from '@lg/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { backdatePayment } from '../../test/backdate.js';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { expectMoneyInvariants } from '../../test/money-invariants.js';

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
  // BR-11: Idempotency-Key — faqat sarlavhada.
  const { idempotencyKey, ...rest } = (payload ?? {}) as Record<string, unknown>;
  if (typeof idempotencyKey === 'string') headers['idempotency-key'] = idempotencyKey;
  return t.app.inject({
    method,
    url: `/api/${url}`,
    payload: payload ? rest : undefined,
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
    idempotencyKey: 'storno-test-pay-1',
  });
  const payJson = payRes.json<{ id: string; receiptNumber: string }>();
  testPaymentId = payJson.id;
  testReceiptNumber = payJson.receiptNumber;
});

afterAll(async () => {
  await expectMoneyInvariants(db);
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
      const receiptRes = await call('GET', `billing/receipts/${testReceiptNumber}`, 'admin');
      expect(receiptRes.statusCode).toBe(200);
      expect(receiptRes.json<{ isCancelled: boolean }>().isCancelled).toBe(true);
    });

    it('Allaqachon storno qilingan toʻlovni qayta storno qilib boʻlmaydi (409)', async () => {
      const res = await call('POST', `billing/payments/${testPaymentId}/reverse`, 'admin', {
        reason: 'Qayta urinish',
      });
      expect(res.statusCode).toBe(409);
    });

    it('BR-16: oʻtgan sana bilan bugun kiritilgan toʻlovni Admin storno qila oladi; kelajak sana — 400', async () => {
      const pay = (n: number, paidAt: number) =>
        call('POST', 'billing/payments', 'admin', {
          studentId: testStudentId,
          amount: '70000',
          method: 'cash',
          paidAt: new Date(paidAt).toISOString(),
          idempotencyKey: `storno-date-${n}`,
        });
      const day = 86_400_000;
      const { id } = (await pay(1, Date.now() - day)).json<{ id: string }>();
      const reversed = await call('POST', `billing/payments/${id}/reverse`, 'admin', {
        reason: 'Xato kiritilgan',
      });
      expect(reversed.statusCode).toBe(201);
      expect((await pay(2, Date.now() + day)).json()).toMatchObject({ code: 'PAYMENT_IN_FUTURE' });
    });

    it('Kiritilgan kundan keyingi toʻlovni Admin storno qila olmaydi (403), faqat Director (200)', async () => {
      const pastPayRes = await call('POST', 'billing/payments', 'admin', {
        studentId: testStudentId,
        amount: '20000000',
        method: 'cash',
        idempotencyKey: 'storno-test-pay-2',
      });
      const pastPayId = pastPayRes.json<{ id: string }>().id;
      await backdatePayment(db, pastPayId);

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

    it('FR-PAY-6: avansdan koʻp refund rad etiladi (409)', async () => {
      const res = await call('POST', 'billing/payments/refund', 'director', {
        studentId: testStudentId,
        amount: '10000000',
        method: 'cash',
        reason: 'Avans yoʻq',
      });
      expect(res.statusCode).toBe(409);
      expect(res.json<{ code: string }>().code).toBe('REFUND_EXCEEDS_ADVANCE');
    });

    it('Director refund qila oladi: ledgerga refund yoziladi (201/200)', async () => {
      const adv = await call('POST', 'billing/payments', 'admin', {
        studentId: testStudentId,
        amount: '10000000',
        method: 'cash',
        idempotencyKey: 'storno-test-pay-3',
      });
      expect(adv.statusCode).toBe(201);
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

    it('T-165: pul qaytarilgan avans toʻlovini storno qilib boʻlmaydi (409) — qaytarilgan pul toʻlovsiz qolardi', async () => {
      const [adv] = await db
        .select({ id: payments.id })
        .from(payments)
        .where(eq(payments.idempotencyKey, 'storno-test-pay-3'));
      const res = await call('POST', `billing/payments/${adv!.id}/reverse`, 'director', {
        reason: 'Xato kiritilgan',
      });
      expect([res.statusCode, res.json<{ code: string }>().code]).toEqual([
        409,
        'REVERSAL_REFUNDED',
      ]);
    });
  });

  describe('Kunlik Kassa Yopish (FR-PAY-10)', () => {
    const todayStr = formatDateToYmd(new Date()); // Asia/Tashkent, UTC emas

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
      expect(res.json<{ code: string }>().code).toBe('CASH_DIFF_NOTE_REQUIRED');
    });

    it('T-140: kelajak kun kassasi yopilmaydi (400), mavjud boʻlmagan kun — 400', async () => {
      const future = await call('POST', 'billing/cash/close', 'admin', {
        date: '2099-01-01',
        countedCash: '0',
      });
      expect(future.json<{ code: string }>().code).toBe('CASH_DATE_IN_FUTURE');
      const wrong = await call('POST', 'billing/cash/close', 'admin', {
        date: '2026-02-31',
        countedCash: '0',
      });
      expect(wrong.statusCode).toBe(400);
    });

    it('T-140: bir vaqtda ikki marta yopish — bittasi oʻtadi, ikkinchisi 409 (500 emas)', async () => {
      const body = { date: '2026-01-05', countedCash: '0' };
      const both = await Promise.all([
        call('POST', 'billing/cash/close', 'admin', body),
        call('POST', 'billing/cash/close', 'director', body),
      ]);
      expect(both.map((r) => r.statusCode).sort()).toEqual([201, 409]);
      const lost = both.find((r) => r.statusCode === 409);
      expect(lost?.json<{ code: string }>().code).toBe('CASH_ALREADY_CLOSED');
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

    it('T-140: kun yopilgach sanalgan summa, farq va izoh koʻrinadi', async () => {
      const res = await call('GET', `billing/cash/day?date=${todayStr}`, 'admin');
      expect(res.json<{ closed: object }>().closed).toMatchObject({
        countedCash: '50000000',
        note: 'Kassa sanaldi, farq kassa qoldigʻi bilan mos',
      });
    });

    it('T-140: tarix sana boʻyicha kursor bilan sahifalanadi', async () => {
      const first = await call('GET', 'billing/cash/closings?limit=1', 'admin');
      const [last] = first.json<{ date: string }[]>();
      const next = await call('GET', `billing/cash/closings?limit=5&cursor=${last!.date}`, 'admin');
      const rest = next.json<{ date: string }[]>();
      expect(rest.length).toBeGreaterThan(0);
      expect(rest.every((r) => r.date < last!.date)).toBe(true);
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
