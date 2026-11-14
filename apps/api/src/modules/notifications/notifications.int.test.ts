import {
  DEFAULT_BRANCH_ID,
  type NotificationPreference,
  type RoleCode,
  type UndeliveredNotificationItem,
} from '@lg/contracts';
import { closeDb, createDb, type Database, notifications, seed, users } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { NotificationsService } from './notifications.service.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let directorToken: string;
let parentToken: string;
let parentUserId: string;

const call = (method: 'GET' | 'POST' | 'PATCH', url: string, token: string, payload?: object) =>
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
  parentUserId = await createUserWithRole(db, 'guardian', '+998905554433');
  parentToken = await tokenFor(t, db, parentUserId, 'guardian');

  // Telegram ID qo'shamiz
  await db.update(users).set({ telegramId: 987654321n }).where(eq(users.id, parentUserId));

  // Bitta yetib bormagan (failed) bildirishnoma yaratamiz
  await db.insert(notifications).values({
    branchId: DEFAULT_BRANCH_ID,
    userId: parentUserId,
    type: 'attendance_absent',
    recipient: '987654321',
    title: 'Darsga kelmadi',
    body: 'Test xabari',
    status: 'failed',
    failedReason: '429 Too Many Requests',
    attempts: 3,
  });
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('T-109: Bildirishnomalar moduli (FR-RPT-4, 6)', () => {
  it('FR-RPT-4: Bildirishnoma sozlamalarini olish (majburiy turlar koʻrsatiladi)', async () => {
    const res = await call('GET', 'notifications/preferences', parentToken);
    expect(res.statusCode).toBe(200);

    const prefs = res.json() as NotificationPreference[];
    expect(prefs.length).toBeGreaterThan(0);

    const absentPref = prefs.find((p) => p.type === 'attendance_absent');
    expect(absentPref?.isMandatory).toBe(true);

    const gradePref = prefs.find((p) => p.type === 'grade_recorded');
    expect(gradePref?.isMandatory).toBe(false);
  });

  it('FR-RPT-4: Ixtiyoriy bildirishnomalarni oʻchirish mumkin', async () => {
    const res = await call('PATCH', 'notifications/preferences', parentToken, {
      preferences: { grade_recorded: false },
    });
    expect(res.statusCode).toBe(200);

    const prefs = res.json() as NotificationPreference[];
    const gradePref = prefs.find((p) => p.type === 'grade_recorded');
    expect(gradePref?.enabled).toBe(false);
  });

  it('FR-RPT-4: Majburiy bildirishnomani (kelmadi/toʻlov) oʻchirib boʻlmaydi (400 Bad Request)', async () => {
    const res = await call('PATCH', 'notifications/preferences', parentToken, {
      preferences: { attendance_absent: false },
    });
    expect(res.statusCode).toBe(400);
  });

  it('AC T-109: notify API orqali xabar yaratiladi va navbatga qoʻyiladi', async () => {
    const service = t.app.get(NotificationsService);
    const result = await service.notify({
      userId: parentUserId,
      type: 'attendance_absent',
      payload: { studentName: 'Test Oʻquvchi', groupName: 'Fizika', date: '2026-11-13' },
    });

    expect(result).toBeDefined();
  });

  it('FR-RPT-6, W-22: Yetib bormagan xabarlar roʻyxati va qayta yuborish (retry)', async () => {
    const forbiddenRes = await call('GET', 'notifications/undelivered', parentToken);
    expect(forbiddenRes.statusCode).toBe(403);

    const allowedRes = await call('GET', 'notifications/undelivered', directorToken);
    expect(allowedRes.statusCode).toBe(200);

    const items = allowedRes.json() as UndeliveredNotificationItem[];
    expect(items.length).toBeGreaterThanOrEqual(1);

    const failedItem = items[0]!;
    expect(failedItem.status).toBe('failed');

    // Qayta yuborish (retry)
    const retryRes = await call(
      'POST',
      `notifications/undelivered/${failedItem.id}/retry`,
      directorToken,
    );
    expect(retryRes.statusCode).toBe(201);
  });
});
