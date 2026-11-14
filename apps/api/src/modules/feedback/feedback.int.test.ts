import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, feedbacks, outboxEvents, seed } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

describe('T-118: Ichki fikr-mulohaza va xatolik hisoboti (FR-SYS-4)', () => {
  let t: TestApp;
  let db: Database;
  let tokens: Map<RoleCode, string>;
  let teacherUserId: string;
  let teacherToken: string;

  beforeAll(async () => {
    t = await createRealTestApp();
    await seed(t.db.url, { withTestDirector: false });
    db = createDb(t.db.url, { max: 2 });
    tokens = await tokensForAllRoles(t, db);

    teacherUserId = await createUserWithRole(db, 'teacher', '+998905559988');
    teacherToken = await tokenFor(t, db, teacherUserId, 'teacher');
  });

  afterAll(async () => {
    await closeDb(db);
    await t.close();
  });

  it('autentifikatsiyasiz 401 qaytaradi', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/feedback',
      payload: {
        type: 'suggestion',
        text: 'Ilovani tezlashtirish kerak',
      },
    });
    expect(res.statusCode).toBe(401);
  });

  it('xodim (ustoz) taklif yubora oladi va outbox yoziladi', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/feedback',
      headers: {
        authorization: `Bearer ${teacherToken}`,
        'x-request-id': 'req-test-uuid-123',
      },
      payload: {
        type: 'suggestion',
        text: 'Darslar roʻyxatida tezkor qidiruv qoʻshilsa yaxshi boʻlardi',
        screen: 'M-01',
        platform: 'miniapp',
        appVersion: '1.0.0',
      },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json<{ id: string; status: string }>();
    expect(body.status).toBe('received');
    expect(body.id).toBeDefined();

    // DB tekshiruvi
    const [row] = await db.select().from(feedbacks).where(eq(feedbacks.id, body.id));
    expect(row).toBeDefined();
    expect(row?.userId).toBe(teacherUserId);
    expect(row?.type).toBe('suggestion');
    expect(row?.screen).toBe('M-01');
    expect(row?.platform).toBe('miniapp');
    expect(row?.requestId).toBe('req-test-uuid-123');

    // Outbox event tekshiruvi
    const [event] = await db
      .select()
      .from(outboxEvents)
      .where(eq(outboxEvents.type, 'feedback.created'));
    expect(event).toBeDefined();
    expect((event?.payload as Record<string, unknown> | null)?.['feedbackId']).toBe(body.id);
  });

  it('validatsiya: matn juda qisqa boʻlsa (< 5 belgi) 400 qaytaradi', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/feedback',
      headers: { authorization: `Bearer ${teacherToken}` },
      payload: {
        type: 'bug',
        text: 'Xato',
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('direktor fikrlar roʻyxatini koʻra oladi', async () => {
    const directorToken = tokens.get('director');
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/feedback',
      headers: { authorization: `Bearer ${directorToken}` },
    });

    expect(res.statusCode).toBe(200);
    const items = res.json<unknown[]>();
    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('oddiy ustoz fikrlar roʻyxatini koʻra olmaydi (403)', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/feedback',
      headers: { authorization: `Bearer ${teacherToken}` },
    });

    expect(res.statusCode).toBe(403);
  });
});
