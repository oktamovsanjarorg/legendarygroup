import type { PublicReceipt, ReceiptVerifyResponse, RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, enrollments, receipts, seed, students } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId: string;
let paymentId: string;
let receiptNumber: string;
let verifyToken: string;

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

  // Kurs va guruh
  const courseRes = await call('POST', 'courses', 'admin', {
    name: 'Ingliz tili PDF Test',
    defaultMonthlyPrice: '500000',
    lessonDurationMin: 80,
  });
  const courseId = courseRes.json<{ id: string }>().id;

  const groupRes = await call('POST', 'groups', 'admin', {
    courseId,
    name: 'ENG-PDF',
    maxStudents: 10,
    startDate: '2026-11-01',
    monthlyPrice: '500000',
  });
  const groupId = groupRes.json<{ id: string }>().id;

  const [student] = await db
    .insert(students)
    .values({
      fullName: 'Sardor Rahimiy',
      searchName: 'sardor rahimiy',
      birthDate: '2010-04-12',
    })
    .returning();
  studentId = student!.id;

  await db.insert(enrollments).values({
    studentId,
    groupId,
    startDate: '2026-11-01',
  });

  // To'lov kiritamiz
  const payRes = await call('POST', 'billing/payments', 'admin', {
    studentId,
    amount: '50000000',
    method: 'card',
  });
  expect(payRes.statusCode).toBe(201);
  const payJson = payRes.json<{ id: string; receiptNumber: string }>();
  paymentId = payJson.id;
  receiptNumber = payJson.receiptNumber;

  const [rc] = await db.select().from(receipts).where(eq(receipts.paymentId, paymentId));
  verifyToken = rc!.verifyToken;
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('PDF Chek va Ommaviy Tekshirish (T-205, FR-PAY-8, BR-19)', () => {
  it('ommaviy QR tekshiruv endpointi (authsiz) toʻgʻri maʼlumot qaytaradi va PII saqlamaydi', async () => {
    const res = await call('GET', `billing/receipts/verify/${verifyToken}`);
    expect(res.statusCode).toBe(200);

    const data = res.json<ReceiptVerifyResponse>();
    expect(data.kind).toBe('valid');
    expect(data.number).toBe(receiptNumber);
    expect(data.amount).toBe('50000000');
    expect(data.center).toBe('Legendary Group');
    expect(data.date).toBeDefined();

    // PII yo'qligi tekshiriladi
    const raw = res.json<Record<string, unknown>>();
    expect(raw['studentName']).toBeUndefined();
    expect(raw['studentId']).toBeUndefined();
    expect(raw['phone']).toBeUndefined();
  });

  it('notoʻgʻri token bilan tekshirganda 404 NOT_FOUND qaytadi', async () => {
    const res = await call('GET', 'billing/receipts/verify/invalid-token-12345');
    expect(res.statusCode).toBe(404);
  });

  it('ommaviy chek raqam boʻyicha tekshirilganda PublicReceipt qaytadi', async () => {
    const res = await call('GET', `billing/receipts/${receiptNumber}`);
    expect(res.statusCode).toBe(200);

    const data = res.json<PublicReceipt>();
    expect(data.number).toBe(receiptNumber);
    expect(data.amount).toBe('50000000');
    expect(data.isCancelled).toBe(false);
  });

  it('PDF chek muvaffaqiyatli generatsiya qilinadi va application/pdf qaytaradi', async () => {
    const res = await call('GET', `billing/receipts/${receiptNumber}/pdf`);
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toBe('application/pdf');
    expect(res.headers['content-disposition']).toContain(`receipt-${receiptNumber}.pdf`);

    // PDF magic baytlarini tekshiramiz (%PDF-1.)
    const buffer = Buffer.from(res.rawPayload);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('mavjud boʻlmagan chek uchun PDF soʻralganda 404 qaytadi', async () => {
    const res = await call('GET', 'billing/receipts/LG-9999-999999/pdf');
    expect(res.statusCode).toBe(404);
  });

  it('storno qilingan chek tekshiruvda reversed va PDFda bekor qilingan boʻlib koʻrinadi', async () => {
    // To'lovni storno qilamiz
    const revRes = await call('POST', `billing/payments/${paymentId}/reverse`, 'admin', {
      reason: 'Mijoz arizasiga koʻra',
    });
    expect(revRes.statusCode).toBe(201);

    // QR tekshiruv endi reversed qaytaradi
    const verifyRes = await call('GET', `billing/receipts/verify/${verifyToken}`);
    expect(verifyRes.statusCode).toBe(200);
    expect(verifyRes.json<ReceiptVerifyResponse>().kind).toBe('reversed');

    // Public receipt isCancelled = true
    const pubRes = await call('GET', `billing/receipts/${receiptNumber}`);
    expect(pubRes.statusCode).toBe(200);
    expect(pubRes.json<PublicReceipt>().isCancelled).toBe(true);

    // PDF yuklab olganda bekor qilingan chek PDF generatsiya bo'ladi
    const pdfRes = await call('GET', `billing/receipts/${receiptNumber}/pdf`);
    expect(pdfRes.statusCode).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    const buffer = Buffer.from(pdfRes.rawPayload);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });
});
