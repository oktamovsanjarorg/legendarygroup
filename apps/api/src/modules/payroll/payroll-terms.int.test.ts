import type {
  PayrollRunDetail,
  PayrollStaffOption,
  RoleCode,
  TeacherAdvance,
  TeacherContract,
} from '@lg/contracts';
import { closeDb, createDb, type Database, payrollRuns, seed } from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

// FR-SAL-1, BR-23/BR-27/BR-28 (Q-104): shartnoma muddati, avans qoldig'i, tasdiqlash sharti.
let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;

type Method = 'GET' | 'POST' | 'DELETE';
const call = (method: Method, url: string, payload?: object, role: RoleCode = 'director') =>
  t.app.inject({
    method,
    url: `/api/payroll/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role)!}` },
  });

const code = (res: { json: () => unknown }) => (res.json() as { code: string }).code;

const contract = async (over: object) =>
  call('POST', 'contracts', { type: 'fixed', fixedAmount: '3100000', base: 'collected', ...over });

const generate = async (period: string): Promise<PayrollRunDetail> => {
  const res = await call('POST', 'runs/generate', { period });
  expect(res.statusCode).toBe(201);
  return res.json<PayrollRunDetail>();
};

const items = (run: PayrollRunDetail, teacherId: string) =>
  (run.teachers.find((x) => x.teacherId === teacherId)?.items ?? [])
    .map((i) => [i.kind, i.amount])
    .sort();

const advance = (teacherId: string, amount: string, givenAt: string) =>
  call('POST', 'advances', { teacherId, amount, givenAt });

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

describe('Shartnoma', () => {
  it('RBAC: Admin va ustoz — 403', async () => {
    const id = '00000000-0000-7000-8000-000000000001';
    for (const role of ['admin', 'teacher'] as const) {
      const results = await Promise.all([
        call('POST', `contracts/${id}/end`, { validTo: '2026-01-01' }, role),
        call('DELETE', `contracts/${id}`, undefined, role),
        call('GET', 'advances', undefined, role),
        call('GET', 'staff', undefined, role),
        call('DELETE', `advances/${id}`, undefined, role),
        call('DELETE', `runs/${id}/adjustments/${id}`, undefined, role),
      ]);
      expect(results.map((r) => r.statusCode)).toEqual(Array(6).fill(403));
    }
  });

  it('xodimlar roʻyxati: bir odam — bir qator; ota-ona yoʻq', async () => {
    const id = await createUserWithRole(db, 'teacher');
    const guardian = await createUserWithRole(db, 'guardian');
    const list = (await call('GET', 'staff')).json<PayrollStaffOption[]>();
    expect(list.filter((s) => s.id === id).map((s) => s.roles)).toEqual([['teacher']]);
    expect(list.some((s) => s.id === guardian)).toBe(false);
  });

  it('turga mos summa shart; ota-onaga shartnoma yozilmaydi', async () => {
    const teacherId = await createUserWithRole(db, 'teacher');
    const none = await contract({ teacherId, fixedAmount: '0', validFrom: '2026-05-01' });
    expect([none.statusCode, code(none)]).toEqual([400, 'CONTRACT_AMOUNT_REQUIRED']);
    const guardian = await createUserWithRole(db, 'guardian');
    const bad = await contract({ teacherId: guardian, validFrom: '2026-05-01' });
    expect(code(bad)).toBe('PAYROLL_NOT_STAFF');
  });

  it('BR-23: yangi shartnoma ochiq eskisini yopadi; ustma-ust — 409', async () => {
    const teacherId = await createUserWithRole(db, 'teacher');
    await contract({ teacherId, validFrom: '2026-01-01' });
    expect((await contract({ teacherId, validFrom: '2026-06-01' })).statusCode).toBe(201);
    const list = (await call('GET', `contracts?teacherId=${teacherId}`)).json<TeacherContract[]>();
    expect(list.map((c) => [c.validFrom, c.validTo])).toEqual([
      ['2026-06-01', null],
      ['2026-01-01', '2026-05-31'],
    ]);
    const clash = await contract({ teacherId, validFrom: '2026-03-01', validTo: '2026-04-01' });
    expect([clash.statusCode, code(clash)]).toEqual([409, 'CONTRACT_OVERLAP']);
  });

  it('BR-23: ketgan ustozga fiks faqat ishlagan kunlari uchun', async () => {
    const teacherId = await createUserWithRole(db, 'teacher');
    const c = (await contract({ teacherId, validFrom: '2026-01-01' })).json<TeacherContract>();
    const end = await call('POST', `contracts/${c.id}/end`, { validTo: '2026-07-10' });
    expect(end.statusCode).toBe(200);
    expect(items(await generate('2026-07'), teacherId)).toEqual([['fixed', '1000000']]);
    expect(items(await generate('2026-08'), teacherId)).toEqual([]);
    expect((await call('DELETE', `contracts/${c.id}`)).statusCode).toBe(204);
    expect(items(await generate('2026-07'), teacherId)).toEqual([]);
  });
});

describe('BR-28: avans', () => {
  it('oylikdan katta avans: bor qismi ushlanadi, qolgani keyingi oyga', async () => {
    const teacherId = await createUserWithRole(db, 'teacher');
    await contract({ teacherId, fixedAmount: '1000000', validFrom: '2026-01-01' });
    expect((await advance(teacherId, '1500000', '2026-02-10')).statusCode).toBe(201);

    const feb = await generate('2026-02');
    expect(items(feb, teacherId)).toEqual([
      ['advance', '-1000000'],
      ['fixed', '1000000'],
    ]);
    expect((await call('POST', `runs/${feb.id}/approve`)).statusCode).toBe(201);
    expect(items(await generate('2026-03'), teacherId)).toEqual([
      ['advance', '-500000'],
      ['fixed', '1000000'],
    ]);
    const row = (await call('GET', 'advances'))
      .json<TeacherAdvance[]>()
      .find((a) => a.teacherId === teacherId)!;
    expect([row.amount, row.withheld]).toEqual(['1500000', '1500000']);
    const del = await call('DELETE', `advances/${row.id}`);
    expect([del.statusCode, code(del)]).toEqual([409, 'ADVANCE_IN_USE']);
  });

  it('shartnomasiz xodim: avans bonusdan ushlanadi; kelajak sana — 400; xatosi oʻchadi', async () => {
    const teacherId = await createUserWithRole(db, 'admin');
    expect(code(await advance(teacherId, '10000', '2099-01-01'))).toBe('ADVANCE_IN_FUTURE');
    const adv = (await advance(teacherId, '10000', '2026-04-02')).json<{ id: string }>();
    const run = await generate('2026-04');
    expect(items(run, teacherId)).toEqual([]);
    await call('POST', `runs/${run.id}/adjustments`, {
      teacherId,
      kind: 'bonus',
      amount: '30000',
      note: 'Yordam uchun',
    });
    expect(items(await generate('2026-04'), teacherId)).toEqual(
      expect.arrayContaining([
        ['bonus', '30000'],
        ['advance', '-10000'],
      ]),
    );
    expect((await call('DELETE', `advances/${adv.id}`)).statusCode).toBe(204);
    expect(items(await generate('2026-04'), teacherId)).toEqual([['bonus', '30000']]);
  });
});

describe('BR-26/BR-27: qoralama va tasdiqlash', () => {
  it('xato bonus olib tashlanadi; avtomatik qator — 404', async () => {
    const teacherId = await createUserWithRole(db, 'teacher');
    await contract({ teacherId, validFrom: '2026-05-01' });
    const run = await generate('2026-05');
    const body = { teacherId, kind: 'bonus', amount: '50000', note: 'Adashib yozildi' };
    await call('POST', `runs/${run.id}/adjustments`, body);
    const detail = (await call('GET', `runs/${run.id}`)).json<PayrollRunDetail>();
    const mine = detail.teachers.find((x) => x.teacherId === teacherId)!.items;
    const bonus = mine.find((i) => i.kind === 'bonus')!;
    const fixed = mine.find((i) => i.kind === 'fixed')!;
    const url = `runs/${run.id}/adjustments`;
    expect((await call('DELETE', `${url}/${fixed.id}`)).statusCode).toBe(404);
    expect((await call('DELETE', `${url}/${bonus.id}`)).statusCode).toBe(204);
    const after = (await call('GET', `runs/${run.id}`)).json<PayrollRunDetail>();
    expect(after.totalAmount).toBe(run.totalAmount);
  });

  it('BR-27: oy tugamasa, eskirgan hisob yoki shart oʻzgargan boʻlsa tasdiqlanmaydi', async () => {
    const now = new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 7);
    const open = await generate(now);
    expect(code(await call('POST', `runs/${open.id}/approve`))).toBe('PAYROLL_PERIOD_OPEN');
    const future = await call('POST', 'runs/generate', { period: '2099-01' });
    expect(code(future)).toBe('PERIOD_IN_FUTURE');

    const run = await generate('2026-06');
    await db
      .update(payrollRuns)
      .set({ generatedAt: new Date('2026-06-20T00:00:00Z') })
      .where(eq(payrollRuns.id, run.id));
    expect(code(await call('POST', `runs/${run.id}/approve`))).toBe('PAYROLL_STALE');

    await generate('2026-06');
    const teacherId = await createUserWithRole(db, 'teacher');
    await advance(teacherId, '1000', '2026-06-01');
    expect(code(await call('POST', `runs/${run.id}/approve`))).toBe('PAYROLL_STALE');
    await generate('2026-06');
    expect((await call('POST', `runs/${run.id}/approve`)).statusCode).toBe(201);
  });
});
