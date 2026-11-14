import type {
  Invoice,
  InvoiceWithLines,
  LedgerEntry,
  RoleCode,
  StudentLedgerSummary,
} from '@lg/contracts';
import { closeDb, createDb, type Database, ledgerEntries, seed } from '@lg/db';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import type { GenerateResult } from './billing-generator.service.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId: string;
let invoiceId: string;

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

  // Kurs, guruh va o'quvchi yaratamiz
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

  const studentRes = await call('POST', 'students', 'admin', {
    fullName: 'Javohir Qodirov',
    phone: '+998901112233',
  });
  studentId = studentRes.json<{ id: string }>().id;

  // Guruhga yozish (enrollment)
  const enrRes = await call('POST', 'enrollments', 'admin', {
    studentId,
    groupId,
    startDate: '2026-11-01',
  });
  const enrollmentId = enrRes.json<{ id: string }>().id;
  await db.execute(sql`UPDATE enrollments SET discount_percent = 10 WHERE id = ${enrollmentId}`);
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Billing API (T-202, FR-BIL-1, 2, BR-1, 2, 6, 20)', () => {
  describe('Ruxsatlar va autentifikatsiya', () => {
    it("tokensiz so'rov 401 UNAUTHORIZED qaytaradi", async () => {
      const res = await call('GET', 'billing/invoices');
      expect(res.statusCode).toBe(401);
    });

    it('teacher billing.view ruxsatiga ega emas (403 FORBIDDEN)', async () => {
      const res = await call('GET', 'billing/invoices', 'teacher');
      expect(res.statusCode).toBe(403);
    });

    it('teacher invoice generate qila olmaydi (403 FORBIDDEN)', async () => {
      const res = await call('POST', 'billing/invoices/generate', 'teacher', { period: '2026-11' });
      expect(res.statusCode).toBe(403);
    });
  });

  describe('Oylik invoicelar generatsiyasi (POST /api/billing/invoices/generate)', () => {
    it('Admin yangi oy uchun invoicelarni yaratadi va ledger yozuvlarini hosil qiladi', async () => {
      const res = await call('POST', 'billing/invoices/generate', 'admin', {
        period: '2026-11',
        dueDate: '2026-11-10',
      });

      expect(res.statusCode).toBe(201);
      const json = res.json<GenerateResult>();
      expect(json.period).toBe('2026-11');
      expect(json.invoicesCreated).toBeGreaterThanOrEqual(1);
      expect(json.linesCreated).toBeGreaterThanOrEqual(1);
      // 500_000 so'm, 10% chegirma bilan: 450_000 so'm
      expect(BigInt(json.totalAmount)).toBe(450_000n);
    });

    it('Idempotentlik: qayta ishga tushirilganda 0 ta yangi invoice yaratiladi', async () => {
      const res = await call('POST', 'billing/invoices/generate', 'admin', {
        period: '2026-11',
      });

      expect(res.statusCode).toBe(201);
      const json = res.json<GenerateResult>();
      expect(json.invoicesCreated).toBe(0);
      expect(json.linesCreated).toBe(0);
      expect(json.totalAmount).toBe('0');
    });
  });

  describe("Invoicelarni ko'rish va qidirish", () => {
    it('GET /api/billing/invoices yaratilgan invoiceni qaytaradi', async () => {
      const res = await call('GET', 'billing/invoices?period=2026-11', 'admin');
      expect(res.statusCode).toBe(200);
      const list = res.json<Invoice[]>();
      expect(list.length).toBeGreaterThanOrEqual(1);

      const inv = list.find((i) => i.studentId === studentId);
      expect(inv).toBeDefined();
      expect(inv!.period).toBe('2026-11');
      expect(inv!.total).toBe('450000');
      expect(inv!.status).toBe('open');
      invoiceId = inv!.id;
    });

    it('GET /api/billing/invoices/:id invoice qatorlari bilan qaytaradi', async () => {
      const res = await call('GET', `billing/invoices/${invoiceId}`, 'admin');
      expect(res.statusCode).toBe(200);
      const inv = res.json<InvoiceWithLines>();
      expect(inv.id).toBe(invoiceId);
      expect(inv.lines.length).toBe(1);
      expect(inv.lines[0]?.amount).toBe('450000');
      expect(inv.lines[0]?.kind).toBe('tuition');
    });
  });

  describe('Moliya daftari (ledger) va balans', () => {
    it("GET /api/billing/ledger/:studentId invoice bo'yicha qarz yozuvini qaytaradi", async () => {
      const res = await call('GET', `billing/ledger/${studentId}`, 'admin');
      expect(res.statusCode).toBe(200);
      const list = res.json<LedgerEntry[]>();
      expect(list.length).toBeGreaterThanOrEqual(1);

      const entry = list[0]!;
      expect(entry.entryType).toBe('invoice');
      expect(entry.amount).toBe('450000'); // musbat = qarz oshgan
    });

    it("GET /api/billing/ledger/:studentId/summary o'quvchi qarzini to'g'ri hisoblaydi", async () => {
      const res = await call('GET', `billing/ledger/${studentId}/summary`, 'admin');
      expect(res.statusCode).toBe(200);
      const summary = res.json<StudentLedgerSummary>();
      expect(summary.studentId).toBe(studentId);
      expect(summary.totalDebt).toBe('450000');
      expect(summary.totalAdvance).toBe('0');
      // Ota-ona ko'radigan balans: -450000 (qarz)
      expect(summary.balance).toBe('-450000');
      expect(summary.isCritical).toBe(false);
    });
  });

  describe('DB trigger: ledger_entries append-only immutability', () => {
    it('ledger_entries qatorini UPDATE qilish forbid_mutation triggeri orqali rad etiladi', async () => {
      const [entry] = await db.select().from(ledgerEntries).limit(1);
      expect(entry).toBeDefined();

      await expect(
        db.execute(sql`UPDATE ledger_entries SET amount = 999 WHERE id = ${entry!.id}`),
      ).rejects.toThrow();
    });

    it('ledger_entries qatorini DELETE qilish forbid_mutation triggeri orqali rad etiladi', async () => {
      const [entry] = await db.select().from(ledgerEntries).limit(1);
      expect(entry).toBeDefined();

      await expect(
        db.execute(sql`DELETE FROM ledger_entries WHERE id = ${entry!.id}`),
      ).rejects.toThrow();
    });
  });
});
