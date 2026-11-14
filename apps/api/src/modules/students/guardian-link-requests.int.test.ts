import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, guardians, seed } from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { TEST_ENV } from '../../test/env.js';

describe('Ota-ona onboarding va bogʻlanish soʻrovlari (T-110 / FR-AUTH-1)', () => {
  let t: TestApp;
  let db: Database;
  let tokens: Map<RoleCode, string>;
  let adminToken: string;
  let teacherToken: string;
  let studentId: string;

  beforeAll(async () => {
    t = await createRealTestApp();
    await seed(t.db.url, { withTestDirector: false });
    db = createDb(t.db.url, { max: 2 });
    tokens = await tokensForAllRoles(t, db);
    adminToken = tokens.get('admin')!;

    const teacherUserId = await createUserWithRole(db, 'teacher');
    teacherToken = await tokenFor(t, db, teacherUserId, 'teacher');

    // Test o'quvchisi yaratamiz
    const createRes = await t.app.inject({
      method: 'POST',
      url: '/api/students',
      headers: { authorization: `Bearer ${adminToken}`, 'content-type': 'application/json' },
      payload: {
        fullName: 'Valiyeva Gulnoza',
        gender: 'female',
        birthDate: '2012-05-10',
      },
    });
    studentId = createRes.json().id;
  });

  afterAll(async () => {
    await closeDb(db);
    await t.close();
  });

  const internalHeaders = {
    'content-type': 'application/json',
    'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN,
  };

  it('1. Bogʻlanish soʻrovlari roʻyxati — Admin 200, Ustoz 403 (W-07)', async () => {
    const adminRes = await t.app.inject({
      method: 'GET',
      url: '/api/guardians/link-requests',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(adminRes.statusCode).toBe(200);
    expect(adminRes.json()).toHaveProperty('items');

    const teacherRes = await t.app.inject({
      method: 'GET',
      url: '/api/guardians/link-requests',
      headers: { authorization: `Bearer ${teacherToken}` },
    });
    expect(teacherRes.statusCode).toBe(403);
  });

  it('2. Yangi foydalanuvchi statusi — not_registered', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/internal/guardian/status',
      headers: internalHeaders,
      payload: { telegramId: 888111001 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('not_registered');
  });

  it('3. Bazada yoʻq raqam kontakt ulashganda — request_created va kutilmoqda statusi', async () => {
    const contactRes = await t.app.inject({
      method: 'POST',
      url: '/internal/guardian/contact',
      headers: internalHeaders,
      payload: {
        telegramId: 888111001,
        phone: '+998901119988',
        fullName: 'Ota-ona Test',
        username: 'test_parent',
      },
    });
    expect(contactRes.statusCode).toBe(200);
    expect(contactRes.json().result).toBe('request_created');

    const statusRes = await t.app.inject({
      method: 'POST',
      url: '/internal/guardian/status',
      headers: internalHeaders,
      payload: { telegramId: 888111001 },
    });
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json().status).toBe('pending_approval');
  });

  it('4. Admin soʻrovni tasdiqlaganda — bogʻlanadi va farzand koʻrinadi', async () => {
    const listRes = await t.app.inject({
      method: 'GET',
      url: '/api/guardians/link-requests?status=pending',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const items = listRes.json().items;
    const req = items.find((i: { phone: string }) => i.phone === '+998901119988');
    expect(req).toBeDefined();

    const approveRes = await t.app.inject({
      method: 'POST',
      url: `/api/guardians/link-requests/${req.id}/approve`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { studentId, relation: 'mother' },
    });
    expect(approveRes.statusCode).toBe(200);
    expect(approveRes.json().status).toBe('approved');

    // Bot statusini qayta tekshiramiz — endi linked va farzand bor
    const statusRes = await t.app.inject({
      method: 'POST',
      url: '/internal/guardian/status',
      headers: internalHeaders,
      payload: { telegramId: 888111001 },
    });
    expect(statusRes.statusCode).toBe(200);
    const body = statusRes.json();
    expect(body.status).toBe('linked');
    expect(body.role).toBe('guardian');
    expect(body.students).toHaveLength(1);
    expect(body.students[0].fullName).toBe('Valiyeva Gulnoza');
  });

  it('5. Bazada mavjud ota-ona kontakt ulashganda — darhol bogʻlanadi', async () => {
    // Avval bazaga ota-onani kiritamiz
    const [g] = await db
      .insert(guardians)
      .values({
        fullName: 'Mavjud Ota',
        phone: '+998902223344',
      })
      .returning();

    const contactRes = await t.app.inject({
      method: 'POST',
      url: '/internal/guardian/contact',
      headers: internalHeaders,
      payload: {
        telegramId: 888111002,
        phone: '+998902223344',
        fullName: 'Mavjud Ota',
      },
    });
    expect(contactRes.statusCode).toBe(200);
    expect(contactRes.json().result).toBe('guardian_linked');
    expect(contactRes.json().fullName).toBe(g!.fullName);
  });

  it('6. Admin soʻrovni rad etganda — rejected statusi va sababi saqlanadi', async () => {
    // Yangi so'rov yaratamiz
    await t.app.inject({
      method: 'POST',
      url: '/internal/guardian/contact',
      headers: internalHeaders,
      payload: {
        telegramId: 888111003,
        phone: '+998903334455',
        fullName: 'Begona Odam',
      },
    });

    const listRes = await t.app.inject({
      method: 'GET',
      url: '/api/guardians/link-requests?status=pending',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const req = listRes.json().items.find((i: { phone: string }) => i.phone === '+998903334455');
    expect(req).toBeDefined();

    const rejectRes = await t.app.inject({
      method: 'POST',
      url: `/api/guardians/link-requests/${req.id}/reject`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { reason: 'Bunday ota-ona mavjud emas' },
    });
    expect(rejectRes.statusCode).toBe(200);
    expect(rejectRes.json().status).toBe('rejected');

    // Bot statusida rad etilganligi va sababi chiqadi
    const statusRes = await t.app.inject({
      method: 'POST',
      url: '/internal/guardian/status',
      headers: internalHeaders,
      payload: { telegramId: 888111003 },
    });
    expect(statusRes.statusCode).toBe(200);
    expect(statusRes.json().status).toBe('rejected');
    expect(statusRes.json().rejectReason).toBe('Bunday ota-ona mavjud emas');
  });
});
