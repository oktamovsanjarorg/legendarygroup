import type {
  AuditLogItem,
  RoleCode,
  StaffActivityItem,
  SuspiciousActivityItem,
} from '@lg/contracts';
import {
  approvalRequests,
  auditLogs,
  closeDb,
  createDb,
  type Database,
  payments,
  seed,
} from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

let directorToken: string;
let adminToken: string;
let teacherToken: string;
let parentToken: string;
let adminUserId: string;

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

  directorToken = tokens.get('director')!;
  adminToken = tokens.get('admin')!;

  adminUserId = await createUserWithRole(db, 'admin', '+998907778899');
  const teacherUserId = await createUserWithRole(db, 'teacher', '+998906665544');
  teacherToken = await tokenFor(t, db, teacherUserId, 'teacher');

  const parentUserId = await createUserWithRole(db, 'guardian', '+998904443322');
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  // Audit log test ma'lumotlari:
  // 1) Oddiy o'zgarish logi (kurs yaratildi)
  await db.insert(auditLogs).values({
    actorId: adminUserId,
    actorRole: 'admin',
    action: 'course.create',
    entity: 'course',
    entityId: '01900000-0000-7000-8000-000000000010',
    before: null,
    after: { name: 'Mental arifmetika', price: 500000 },
    ip: '127.0.0.1',
    at: new Date('2026-11-10T10:00:00Z'),
  });

  // 2) Shubhali amal: payment.reverse (diff bilan)
  await db.insert(auditLogs).values({
    actorId: adminUserId,
    actorRole: 'admin',
    action: 'payment.reverse',
    entity: 'payment',
    entityId: '01900000-0000-7000-8000-000000000020',
    before: { status: 'paid', amount: 500000 },
    after: { status: 'reversed', amount: 500000 },
    ip: '192.168.1.50',
    at: new Date('2026-11-12T15:00:00Z'),
  });

  // 3) Tunda bajarilgan amal (UTC 20:00 = Toshkent 01:00)
  await db.insert(auditLogs).values({
    actorId: adminUserId,
    actorRole: 'admin',
    action: 'student.update',
    entity: 'student',
    entityId: '01900000-0000-7000-8000-000000000030',
    before: { phone: '+998901111111' },
    after: { phone: '+998902222222' },
    ip: '10.0.0.1',
    at: new Date('2026-11-13T20:00:00Z'),
  });

  // Xodim faolligi uchun to'lov va approval:
  const studentRes = await call('POST', 'students', adminToken, {
    fullName: 'Qodirov Aziz',
    birthDate: '2011-01-01',
    gender: 'male',
  });
  const studentId = studentRes.json<{ id: string }>().id;

  await db.insert(payments).values({
    studentId,
    amount: 1_000_000n,
    method: 'cash',
    paidAt: new Date('2026-11-05T10:00:00Z'),
    receivedBy: adminUserId,
    idempotencyKey: 'int-audit-pay-1',
  });

  // Approval hal qilingan: 30 daqiqa farq bilan
  await db.insert(approvalRequests).values({
    branchId: '01900000-0000-7000-8000-000000000001',
    type: 'discount',
    payload: { studentId, discountPercent: 10 },
    reason: 'Ijtimoiy yordam',
    requestedBy: adminUserId,
    status: 'approved',
    decidedBy: adminUserId,
    createdAt: new Date('2026-11-06T10:00:00Z'),
    decidedAt: new Date('2026-11-06T10:30:00Z'),
    expiresAt: new Date('2026-11-08T10:00:00Z'),
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.app.close();
});

describe('T-404: Audit UI va shubhali harakatlar (FR-AUD-1, 2, 3)', () => {
  it('RBAC: faqat Director auditni koʻra oladi, Admin/Ustoz/Ota-ona 403 oladi', async () => {
    const resAdmin = await call('GET', 'audit/logs', adminToken);
    expect(resAdmin.statusCode).toBe(403);

    const resTeacher = await call('GET', 'audit/logs', teacherToken);
    expect(resTeacher.statusCode).toBe(403);

    const resParent = await call('GET', 'audit/logs', parentToken);
    expect(resParent.statusCode).toBe(403);

    const resDirector = await call('GET', 'audit/logs', directorToken);
    expect(resDirector.statusCode).toBe(200);
  });

  it('FR-AUD-1: Audit jurnali roʻyxati va diff koʻrinishi', async () => {
    const res = await call('GET', 'audit/logs', directorToken);
    expect(res.statusCode).toBe(200);
    const logs = res.json<AuditLogItem[]>();
    expect(logs.length).toBeGreaterThanOrEqual(3);

    // Diff tekshiruvi: payment.reverse da status o'zgargan
    const revLog = logs.find((l) => l.action === 'payment.reverse');
    expect(revLog).toBeDefined();
    expect(revLog?.diff).toBeDefined();
    expect(revLog?.diff?.some((d) => d.field === 'status' && d.after === 'reversed')).toBe(true);
  });

  it('Audit filtrlar: action va entity boʻyicha saralash', async () => {
    const res = await call('GET', 'audit/logs?action=course.create', directorToken);
    expect(res.statusCode).toBe(200);
    const logs = res.json<AuditLogItem[]>();
    expect(logs.every((l) => l.action === 'course.create')).toBe(true);

    const resEntity = await call('GET', 'audit/logs?entity=payment', directorToken);
    expect(resEntity.statusCode).toBe(200);
    expect(resEntity.json<AuditLogItem[]>().every((l) => l.entity === 'payment')).toBe(true);
  });

  it('FR-AUD-2: Shubhali harakatlar roʻyxati (payment.reverse va tungi amallar)', async () => {
    const res = await call('GET', 'audit/suspicious', directorToken);
    expect(res.statusCode).toBe(200);
    const suspicious = res.json<SuspiciousActivityItem[]>();
    expect(suspicious.length).toBeGreaterThanOrEqual(2);

    // payment.reverse high risk
    const rev = suspicious.find((s) => s.action === 'payment.reverse');
    expect(rev).toBeDefined();
    expect(rev?.riskLevel).toBe('high');
    expect(rev?.title).toContain('storno');

    // Tungi amal
    const night = suspicious.find((s) => s.action === 'student.update');
    expect(night).toBeDefined();
    expect(night?.title).toContain('Tunda');
  });

  it('FR-AUD-3: Xodimlar faolligi hisoboti (toʻlovlar, qarorlar, oʻrtacha vaqt)', async () => {
    const res = await call('GET', 'audit/staff-activity', directorToken);
    expect(res.statusCode).toBe(200);
    const staff = res.json<StaffActivityItem[]>();
    expect(staff.length).toBeGreaterThanOrEqual(1);

    const testAdmin = staff.find((s) => s.staffId === adminUserId);
    expect(testAdmin).toBeDefined();
    expect(testAdmin?.paymentsCount).toBeGreaterThanOrEqual(1);
    expect(testAdmin?.approvalsCount).toBeGreaterThanOrEqual(1);
    // 30 daqiqa bo'lishi kerak
    expect(testAdmin?.avgResponseTimeMinutes).toBe(30);
    expect(testAdmin?.avgResponseTimeFormatted).toBe('30 daq');
  });
});
