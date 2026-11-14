import { randomBytes } from 'node:crypto';
import type { PaymentSubmission, RoleCode } from '@lg/contracts';
import {
  closeDb,
  createDb,
  type Database,
  files,
  guardians,
  ledgerEntries,
  payments,
  paymentSubmissions,
  receipts,
  seed,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

let parentToken: string;
let parentUserId: string;
let admin2Token: string;
let ownStudentId: string;
let foreignStudentId: string;
let fileId: string;
let fileId2: string;

const call = (method: 'GET' | 'POST', url: string, token: string, payload?: object) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);

  const adminToken = tokens.get('admin')!;
  const admin2UserId = await createUserWithRole(db, 'admin');
  admin2Token = await tokenFor(t, db, admin2UserId, 'admin');

  const createStudent = async (fullName: string, phone: string) =>
    (
      await call('POST', 'students', adminToken, {
        fullName,
        guardians: [{ fullName: `Ota-ona ${phone.slice(-4)}`, phone, relation: 'mother' }],
      })
    ).json<{ id: string; guardians: { guardianId: string }[] }>();

  const s1 = await createStudent('Alisher Navoiy', '+998901112233');
  const s2 = await createStudent('Bobur Mirzo', '+998909998877');
  ownStudentId = s1.id;
  foreignStudentId = s2.id;

  parentUserId = await createUserWithRole(db, 'guardian', '+998901112233');
  await db
    .update(guardians)
    .set({ userId: parentUserId })
    .where(eq(guardians.id, s1.guardians[0]!.guardianId));
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  const shaA = randomBytes(32).toString('hex');
  const [f1] = await db
    .insert(files)
    .values({
      s3Key: `receipts/${shaA}.jpg`,
      mime: 'image/jpeg',
      size: 2048,
      sha256: shaA,
      purpose: 'payment_receipt',
      uploadedBy: parentUserId,
    })
    .returning();
  fileId = f1!.id;

  const shaB = randomBytes(32).toString('hex');
  const [f2] = await db
    .insert(files)
    .values({
      s3Key: `receipts/${shaB}.jpg`,
      mime: 'image/jpeg',
      size: 4096,
      sha256: shaB,
      purpose: 'payment_receipt',
      uploadedBy: parentUserId,
    })
    .returning();
  fileId2 = f2!.id;
});

afterAll(async () => {
  await closeDb(db);
  await t.app.close();
});

describe('T-206 & T-207 Toʻlov cheki yuborish va Admin tasdiqlash oqimi (BR-13, 14, 15)', () => {
  let createdSubmissionId: string;
  let secondSubmissionId: string;

  it('ota-ona oʻz farzandi uchun chek yubora oladi (FR-PAY-3)', async () => {
    const res = await call('POST', 'billing/submissions', parentToken, {
      studentId: ownStudentId,
      amountClaimed: '500000',
      comment: 'Noyabr oyi uchun Payme orqali toʻlov',
      fileId,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<PaymentSubmission>();
    expect(body.id).toBeDefined();
    expect(body.status).toBe('pending_review');
    expect(body.amountClaimed).toBe('500000');
    expect(body.duplicateWarning).toBeNull();
    createdSubmissionId = body.id;
  });

  it('ota-ona begona oʻquvchi uchun chek yubora olmaydi (IDOR himoyasi — 404)', async () => {
    const res = await call('POST', 'billing/submissions', parentToken, {
      studentId: foreignStudentId,
      amountClaimed: '300000',
      fileId: fileId2,
    });
    expect(res.statusCode).toBe(404);
  });

  it('BR-15 bir xil summa qisqa vaqt ichida yuborilsa dublikat ogohlantirishi beradi', async () => {
    const res = await call('POST', 'billing/submissions', parentToken, {
      studentId: ownStudentId,
      amountClaimed: '500000',
      comment: 'Qayta yuborish',
      fileId: fileId2,
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<PaymentSubmission>();
    expect(body.duplicateWarning).toContain('daqiqa ichida');
    secondSubmissionId = body.id;
  });

  it('ota-ona oʻz yuborgan cheklar tarixini koʻra oladi', async () => {
    const res = await call('GET', 'billing/submissions/my', parentToken);
    expect(res.statusCode).toBe(200);
    const list = res.json<PaymentSubmission[]>();
    expect(list.length).toBeGreaterThanOrEqual(2);
    expect(list.some((s) => s.id === createdSubmissionId)).toBe(true);
  });

  it('admin navbatda koʻrib chiqilmagan cheklarni koʻradi (W-14, MS-02)', async () => {
    const res = await call(
      'GET',
      'billing/submissions?status=pending_review',
      tokens.get('admin')!,
    );
    expect(res.statusCode).toBe(200);
    const list = res.json<PaymentSubmission[]>();
    const found = list.find((s) => s.id === createdSubmissionId);
    expect(found).toBeDefined();
    expect(found?.studentName).toBe('Alisher Navoiy');
  });

  it('BR-13 admin chekni 5 daqiqaga qulfplay oladi va parallel toʻqnashuvdan himoyalaydi', async () => {
    const adminToken = tokens.get('admin')!;

    const lockRes = await call(
      'POST',
      `billing/submissions/${createdSubmissionId}/lock`,
      adminToken,
    );
    expect(lockRes.statusCode).toBe(201);

    const conflictRes = await call(
      'POST',
      `billing/submissions/${createdSubmissionId}/lock`,
      admin2Token,
    );
    expect(conflictRes.statusCode).toBe(409);
    expect(conflictRes.json<{ code: string }>().code).toBe('LOCKED_BY_OTHER');
  });

  it('admin chekni tasdiqlab toʻlovga oʻtkazadi (summani oʻzgartirgan holda)', async () => {
    const adminToken = tokens.get('admin')!;
    const res = await call(
      'POST',
      `billing/submissions/${createdSubmissionId}/confirm`,
      adminToken,
      {
        amount: '480000',
        notes: 'Bank komissiyasi 20,000 soʻm ushlab qolingan',
      },
    );

    expect(res.statusCode).toBe(201);
    const body = res.json<{ success: boolean; paymentId: string; receiptNumber: string }>();
    expect(body.success).toBe(true);
    expect(body.paymentId).toBeDefined();
    expect(body.receiptNumber).toMatch(/^LG-\d{4}-\d{6}$/);

    const [pay] = await db.select().from(payments).where(eq(payments.id, body.paymentId));
    expect(pay).toBeDefined();
    expect(pay?.amount).toBe(480000n);
    expect(pay?.method).toBe('bank');

    const [rc] = await db.select().from(receipts).where(eq(receipts.paymentId, body.paymentId));
    expect(rc).toBeDefined();
    expect(rc?.number).toBe(body.receiptNumber);

    const [ledger] = await db
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.refId, body.paymentId));
    expect(ledger).toBeDefined();
    expect(ledger?.amount).toBe(-480000n);
  });

  it('tasdiqlangan chekni qayta tasdiqlash yoki rad etish mumkin emas (ALREADY_REVIEWED)', async () => {
    const adminToken = tokens.get('admin')!;
    const res = await call(
      'POST',
      `billing/submissions/${createdSubmissionId}/confirm`,
      adminToken,
      {},
    );
    expect(res.statusCode).toBe(409);
    expect(res.json<{ code: string }>().code).toBe('ALREADY_REVIEWED');
  });

  it('admin notoʻgʻri chekni sabab koʻrsatib rad eta oladi', async () => {
    const adminToken = tokens.get('admin')!;
    const res = await call('POST', `billing/submissions/${secondSubmissionId}/reject`, adminToken, {
      reason: 'Chekda oʻquvchi ismi yoki tranzaksiya raqami koʻrinmayapti',
    });

    expect(res.statusCode).toBe(201);
    const [sub] = await db
      .select()
      .from(paymentSubmissions)
      .where(eq(paymentSubmissions.id, secondSubmissionId));
    expect(sub?.status).toBe('rejected');
    expect(sub?.rejectReason).toContain('koʻrinmayapti');
  });

  it('RBAC: ota-ona navbatga kira olmaydi, oʻqituvchi tasdiqlay olmaydi (403 Forbidden)', async () => {
    const parentNavbat = await call('GET', 'billing/submissions', parentToken);
    expect(parentNavbat.statusCode).toBe(403);

    const teacherToken = tokens.get('teacher')!;
    const teacherConfirm = await call(
      'POST',
      `billing/submissions/${secondSubmissionId}/confirm`,
      teacherToken,
      {},
    );
    expect(teacherConfirm.statusCode).toBe(403);
  });
});
