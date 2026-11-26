import type { Permission, RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import type { RequestUser } from '../auth/index.js';
import { ASSISTANT_DEPS } from './assistant.service.js';
import type { AssistantDeps } from './assistant.deps.js';
import { AssistantToolbox } from './assistant.toolbox.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let studentId: string;

const post = (role: RoleCode, payload: Record<string, unknown>) =>
  t.app.inject({
    method: 'POST',
    url: '/api/assistant/chat',
    headers: { authorization: `Bearer ${tokens.get(role) ?? ''}` },
    payload,
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const res = await t.app.inject({
    method: 'POST',
    url: '/api/students',
    headers: { authorization: `Bearer ${tokens.get('admin') ?? ''}` },
    payload: { fullName: 'Yordamchiyev Sardor', birthDate: '2013-01-10', gender: 'male' },
  });
  studentId = res.json<{ id: string }>().id;
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('POST /assistant/chat (Q-114)', () => {
  it('forbidden: ustoz, ota-ona, oʻquvchi — 403', async () => {
    for (const role of ['teacher', 'guardian', 'student'] as const) {
      const r = await post(role, { messages: [{ role: 'user', text: 'salom' }] });
      expect(r.statusCode, role).toBe(403);
    }
  });

  it('kalit sozlanmagan — 503 ASSISTANT_DISABLED; status — enabled:false', async () => {
    const r = await post('admin', { messages: [{ role: 'user', text: 'bugun tushum?' }] });
    expect(r.statusCode).toBe(503);
    expect(r.json()).toMatchObject({ code: 'ASSISTANT_DISABLED' });
    const s = await t.app.inject({
      method: 'GET',
      url: '/api/assistant/status',
      headers: { authorization: `Bearer ${tokens.get('director') ?? ''}` },
    });
    expect(s.json()).toEqual({ enabled: false });
  });

  it('validatsiya: oxirgi xabar foydalanuvchiniki, boʻsh emas — 400', async () => {
    expect((await post('admin', { messages: [] })).statusCode).toBe(400);
    const r = await post('admin', { messages: [{ role: 'assistant', text: 'x' }] });
    expect(r.statusCode).toBe(400);
  });
});

describe('Yordamchi vositalari — haqiqiy servislar, chaqiruvchi ruxsati bilan', () => {
  const box = (role: RoleCode, perms: Permission[]) => {
    const user: RequestUser = {
      id: '00000000-0000-4000-8000-000000000000',
      role,
      sessionId: null,
      pv: 1,
    };
    return new AssistantToolbox(t.app.get<AssistantDeps>(ASSISTANT_DEPS), user, new Set(perms));
  };

  it('qidiruv va oʻquvchi xulosasi; ruxsat boʻlmasa — xato natija', async () => {
    const admin = box('admin', ['student.view', 'billing.view']);
    const found = await admin.run('search_students', { query: 'Yordamchiyev' });
    expect(JSON.parse(found.content)).toEqual([
      expect.objectContaining({ id: studentId, name: 'Yordamchiyev Sardor' }),
    ]);
    const card = JSON.parse(
      (await admin.run('student_overview', { student_id: studentId })).content,
    );
    expect(card).toMatchObject({ name: 'Yordamchiyev Sardor', debt: '0', guardians: [] });
    const none = await box('admin', []).run('search_students', { query: 'Yordamchiyev' });
    expect(none.isError).toBe(true);
  });

  it('mavjud boʻlmagan oʻquvchi — «Topilmadi», istisno emas', async () => {
    const r = await box('admin', ['student.view']).run('student_overview', {
      student_id: '22222222-2222-4222-8222-222222222222',
    });
    expect(r).toMatchObject({ isError: true });
  });
});
