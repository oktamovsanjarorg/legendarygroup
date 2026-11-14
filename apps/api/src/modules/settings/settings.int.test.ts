import { type RoleCode } from '@lg/contracts';
import { auditLogs, closeDb, createDb, type Database, seed } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

type Method = 'GET' | 'PATCH';
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
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Settings API (T-115, FR-SYS-1)', () => {
  describe('GET /api/settings/public', () => {
    it('tokensiz murojaatda ommaviy sozlamalarni qaytaradi (200)', async () => {
      const res = await call('GET', 'settings/public');
      expect(res.statusCode).toBe(200);
      const json = res.json<{
        centerInfo: { name: string; phone: string };
        paymentCards: unknown[];
        billingDueDay: number;
      }>();
      expect(json.centerInfo.name).toBe('Legendary Group');
      expect(json.centerInfo.phone).toBe('+998901234567');
      expect(json.billingDueDay).toBe(10);
      expect(Array.isArray(json.paymentCards)).toBe(true);
    });
  });

  describe('Ruxsatlar: settings.manage (faqat Director)', () => {
    it('admin, ustoz va ota-ona uchun GET /api/settings taqiqlangan (403)', async () => {
      for (const role of ['admin', 'teacher', 'guardian'] as const) {
        const res = await call('GET', 'settings', role);
        expect(res.statusCode).toBe(403);
      }
    });

    it('admin, ustoz va ota-ona uchun PATCH /api/settings taqiqlangan (403)', async () => {
      for (const role of ['admin', 'teacher', 'guardian'] as const) {
        const res = await call('PATCH', 'settings', role, { billingDueDay: 15 });
        expect(res.statusCode).toBe(403);
      }
    });

    it('Director toʻliq sozlamalarni koʻra oladi (200)', async () => {
      const res = await call('GET', 'settings', 'director');
      expect(res.statusCode).toBe(200);
      const json = res.json<{
        billingDueDay: number;
        penaltyConfig: { absenceThreshold: number };
        notificationTimes: { morningReminderTime: string };
      }>();
      expect(json.billingDueDay).toBe(10);
      expect(json.penaltyConfig.absenceThreshold).toBe(3);
      expect(json.notificationTimes.morningReminderTime).toBe('08:30');
    });
  });

  describe('PATCH /api/settings (Director tahrirlashi va Audit)', () => {
    it('sozlamalarni yangilaydi va audit yozuvini yaratadi', async () => {
      const patch = {
        billingDueDay: 15,
        centerInfo: {
          name: 'Legendary Academy',
        },
        adminDiscountLimitPercent: 15,
      };

      const res = await call('PATCH', 'settings', 'director', patch);
      expect(res.statusCode).toBe(200);
      const json = res.json<{
        billingDueDay: number;
        centerInfo: { name: string };
        adminDiscountLimitPercent: number;
      }>();

      expect(json.billingDueDay).toBe(15);
      expect(json.centerInfo.name).toBe('Legendary Academy');
      expect(json.adminDiscountLimitPercent).toBe(15);

      // Audit log tekshiruvi
      const logs = await db.select().from(auditLogs).where(eq(auditLogs.action, 'settings.update'));
      expect(logs.length).toBeGreaterThan(0);
      const last = logs[logs.length - 1];
      expect(last?.entity).toBe('settings');
      expect(last?.entityId).toBe('system');
      expect(last?.after).toMatchObject({
        billingDueDay: 15,
        adminDiscountLimitPercent: 15,
      });

      // GET orqali tekshirish
      const getRes = await call('GET', 'settings', 'director');
      expect(getRes.json<{ billingDueDay: number }>().billingDueDay).toBe(15);
    });

    it('notoʻgʻri billingDueDay (35) yuborilsa validatsiya xatosi (400)', async () => {
      const res = await call('PATCH', 'settings', 'director', { billingDueDay: 35 });
      expect(res.statusCode).toBe(400);
    });

    it('boʻsh body yuborilsa EMPTY_PATCH validatsiya xatosi (400)', async () => {
      const res = await call('PATCH', 'settings', 'director', {});
      expect(res.statusCode).toBe(400);
    });
  });
});
