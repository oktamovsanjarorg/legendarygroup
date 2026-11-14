import { type RoleCode } from '@lg/contracts';
import { approvalRequests, auditLogs, closeDb, createDb, type Database, seed } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

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
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Approvals API (T-119, 02-roles-permissions.md §5)', () => {
  describe('RBAC tekshiruvlari', () => {
    it('ustoz va ota-ona soʻrov yarata olmaydi (403)', async () => {
      for (const role of ['teacher', 'guardian'] as const) {
        const res = await call('POST', 'approvals', role, {
          type: 'discount',
          payload: {
            studentId: '11111111-1111-4111-8111-111111111111',
            percent: 20,
            reason: 'Olimpiada',
          },
          reason: 'Chegirma soʻrovi',
        });
        expect(res.statusCode).toBe(403);
      }
    });

    it('qaror qabul qilish faqat Director uchun (Admin/Ustoz/Ota-ona 403)', async () => {
      const dummyId = '00000000-0000-4000-8000-000000000000';
      for (const role of ['admin', 'teacher', 'guardian'] as const) {
        const res = await call('POST', `approvals/${dummyId}/decide`, role, {
          decision: 'approve',
        });
        expect(res.statusCode).toBe(403);
      }
    });
  });

  describe('Soʻrov yaratish va tasdiqlash oqimi', () => {
    let requestId: string;

    it('Admin soʻrov yaratadi (201)', async () => {
      const res = await call('POST', 'approvals', 'admin', {
        type: 'reversal',
        payload: {
          paymentId: '22222222-2222-4222-8222-222222222222',
          reason: 'Kassa adashishi',
        },
        reason: 'Kecha kiritilgan toʻlovni storno qilish',
      });

      expect(res.statusCode).toBe(201);
      const json = res.json<{
        id: string;
        status: string;
        type: string;
        reason: string;
        expiresAt: string;
      }>();
      expect(json.status).toBe('pending');
      expect(json.type).toBe('reversal');
      expect(json.reason).toBe('Kecha kiritilgan toʻlovni storno qilish');
      requestId = json.id;
    });

    it('Soʻrovni ID orqali koʻrish mumkin (200)', async () => {
      const res = await call('GET', `approvals/${requestId}`, 'admin');
      expect(res.statusCode).toBe(200);
      const json = res.json<{ id: string; status: string }>();
      expect(json.id).toBe(requestId);
      expect(json.status).toBe('pending');
    });

    it('Director soʻrovni tasdiqlaydi (201/200)', async () => {
      const res = await call('POST', `approvals/${requestId}/decide`, 'director', {
        decision: 'approve',
        note: 'Storno tasdiqlandi',
      });

      expect(res.statusCode).toBe(201);
      const json = res.json<{
        status: string;
        decisionNote: string;
        decidedBy: string;
      }>();
      expect(json.status).toBe('approved');
      expect(json.decisionNote).toBe('Storno tasdiqlandi');
      expect(json.decidedBy).toBeTruthy();
    });

    it('Allaqachon tasdiqlangan soʻrovga qayta qaror qilib boʻlmaydi (409)', async () => {
      const res = await call('POST', `approvals/${requestId}/decide`, 'director', {
        decision: 'reject',
      });
      expect(res.statusCode).toBe(409);
    });
  });

  describe('Rad etish va eskirish ssenariylari', () => {
    it('Director soʻrovni rad eta oladi (rejected)', async () => {
      const createRes = await call('POST', 'approvals', 'admin', {
        type: 'discount',
        payload: {
          studentId: '11111111-1111-4111-8111-111111111111',
          percent: 50,
          reason: 'Maxsus chegirma',
        },
        reason: '50% chegirma',
      });
      const req = createRes.json<{ id: string }>();

      const decideRes = await call('POST', `approvals/${req.id}/decide`, 'director', {
        decision: 'reject',
        note: 'Chegirma rad etildi',
      });
      expect(decideRes.statusCode).toBe(201);
      expect(decideRes.json<{ status: string }>().status).toBe('rejected');
    });

    it('48 soatdan oʻtgan soʻrov avtomatik expired boʻladi va qaror qabul qilib boʻlmaydi (409)', async () => {
      const createRes = await call('POST', 'approvals', 'admin', {
        type: 'refund',
        payload: {
          paymentId: '33333333-3333-4333-8333-333333333333',
          amount: '50000000',
          reason: 'Kurs toʻxtatildi',
        },
        reason: 'Pulni qaytarish',
      });
      const req = createRes.json<{ id: string }>();

      // Bazada expiresAt vaqtini o'tmishga suramiz
      const past = new Date(Date.now() - 1000);
      await db
        .update(approvalRequests)
        .set({ expiresAt: past })
        .where(eq(approvalRequests.id, req.id));

      // Ro'yxat olinganda expired bo'lishini tekshiramiz
      const listRes = await call('GET', 'approvals', 'director');
      expect(listRes.statusCode).toBe(200);

      // Qaror qabul qilish urinishi -> 409
      const decideRes = await call('POST', `approvals/${req.id}/decide`, 'director', {
        decision: 'approve',
      });
      expect(decideRes.statusCode).toBe(409);
    });
  });

  describe('Audit jurnali tekshiruvi', () => {
    it('yaratish va qaror qabul qilish audit_logs ga yozilgan', async () => {
      const logs = await db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.entity, 'approval_request'));

      expect(logs.length).toBeGreaterThanOrEqual(2);
      const actions = logs.map((l) => l.action);
      expect(actions).toContain('approval.create');
      expect(actions).toContain('approval.decide');
    });
  });
});
