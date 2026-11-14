import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { idempotencyKeys } from '@lg/db';
import { FixedClock } from '@lg/domain';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createModuleTestApp, type TestApp } from '../../test/test-app.js';
import { createDb, closeDb, type Database } from '@lg/db';
import { stableStringify } from './idempotency.interceptor.js';

let calls = 0;
let delayMs = 0;
let fail = false;

@Controller('pay')
class PayController {
  @Post()
  async create(@Body() body: { amount: string }) {
    calls += 1;
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    if (fail) throw new Error('kutilgan xato');
    return { id: `p${calls}`, amount: body.amount };
  }

  @Post('ok')
  @HttpCode(200)
  ok() {
    calls += 1;
    return { ok: true };
  }
}

const clock = new FixedClock('2026-11-11T10:00:00.000Z');
let t: TestApp;
let db: Database;

const post = (key: string, payload: object, user?: string, url = '/pay') =>
  t.app.inject({
    method: 'POST',
    url,
    payload,
    headers: { 'idempotency-key': key, ...(user && { 'x-test-user': user }) },
  });

beforeAll(async () => {
  t = await createModuleTestApp({ controllers: [PayController], clock });
  db = createDb(t.db.url, { max: 1 });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});
beforeEach(async () => {
  calls = 0;
  delayMs = 0;
  fail = false;
  clock.setNow('2026-11-11T10:00:00.000Z');
  await db.delete(idempotencyKeys);
});

describe('IdempotencyInterceptor (T-004, CLAUDE.md "Idempotentlik")', () => {
  it("takroriy so'rov: handler 1 marta, javob va status (201) qaytariladi", async () => {
    const a = await post('k1', { amount: '1000' });
    const b = await post('k1', { amount: '1000' });
    expect(calls).toBe(1);
    expect([a.statusCode, b.statusCode]).toEqual([201, 201]);
    expect(b.json()).toEqual(a.json());
    expect(b.headers['idempotent-replay']).toBe('true');
  });

  it('@HttpCode status ham saqlanadi', async () => {
    await post('k1', {}, undefined, '/pay/ok');
    expect((await post('k1', {}, undefined, '/pay/ok')).statusCode).toBe(200);
    expect(calls).toBe(1);
  });

  it("PARALLEL ikki so'rov — handler faqat 1 marta (ikki marta to'lov yo'q)", async () => {
    delayMs = 300;
    const [a, b] = await Promise.all([post('k1', { amount: '5' }), post('k1', { amount: '5' })]);
    expect(calls).toBe(1);
    expect([a.statusCode, b.statusCode].sort()).toEqual([201, 409]);
    const conflict = [a, b].find((r) => r.statusCode === 409);
    expect(conflict?.json<{ code: string }>().code).toBe('IDEMPOTENCY_IN_PROGRESS');
  });

  it('boshqa body bilan shu kalit → 422 IDEMPOTENCY_CONFLICT', async () => {
    await post('k1', { amount: '1000' });
    const res = await post('k1', { amount: '9999' });
    expect(res.statusCode).toBe(422);
    expect(res.json<{ code: string }>().code).toBe('IDEMPOTENCY_CONFLICT');
    expect(calls).toBe(1);
  });

  it("kalit foydalanuvchiga bog'langan — begona javob qaytmaydi", async () => {
    const u1 = '019a0000-0000-7000-8000-000000000001';
    const u2 = '019a0000-0000-7000-8000-000000000002';
    await insertUsers(db, [u1, u2]);
    const a = await post('same', { amount: '1' }, u1);
    const b = await post('same', { amount: '1' }, u2);
    expect(calls).toBe(2);
    expect(a.json()).not.toEqual(b.json());
  });

  it('handler xatosi — band bekor, shu kalit bilan qayta urinish ishlaydi', async () => {
    fail = true;
    expect((await post('k1', { amount: '1' })).statusCode).toBe(500);
    fail = false;
    expect((await post('k1', { amount: '1' })).statusCode).toBe(201);
    expect(calls).toBe(2);
  });

  it('24 soatdan keyin kalit qayta ishlatiladi', async () => {
    await post('k1', { amount: '1' });
    clock.advance(24 * 60 * 60 * 1000 + 1);
    await post('k1', { amount: '1' });
    expect(calls).toBe(2);
  });

  it('osilib qolgan band (5 daqiqadan eski, tugallanmagan) qayta egallanadi', async () => {
    await db.insert(idempotencyKeys).values({
      key: 'k1',
      route: 'POST /pay',
      requestHash: 'x',
      createdAt: new Date('2026-11-11T09:50:00.000Z'),
      expiresAt: new Date('2026-11-12T09:50:00.000Z'),
    });
    expect((await post('k1', { amount: '1' })).statusCode).toBe(201);
    expect(calls).toBe(1);
  });

  it("GET va kalitsiz so'rovlar saqlanmaydi; noto'g'ri kalit → 400", async () => {
    await t.app.inject({ method: 'POST', url: '/pay', payload: { amount: '1' } });
    expect(await db.$count(idempotencyKeys)).toBe(0);
    const bad = await post('x'.repeat(129), { amount: '1' });
    expect(bad.statusCode).toBe(400);
    expect(bad.json<{ code: string }>().code).toBe('INVALID_IDEMPOTENCY_KEY');
  });
});

describe('stableStringify', () => {
  it("kalitlar tartibi hashga ta'sir qilmaydi", () => {
    expect(stableStringify({ b: 1, a: { d: [1, 2], c: null } })).toBe(
      stableStringify({ a: { c: null, d: [1, 2] }, b: 1 }),
    );
  });
});

async function insertUsers(database: Database, ids: string[]): Promise<void> {
  const { users } = await import('@lg/db');
  await database
    .insert(users)
    .values(ids.map((id, i) => ({ id, fullName: `U${i}`, phone: `+99890000010${i}` })))
    .onConflictDoNothing();
}
