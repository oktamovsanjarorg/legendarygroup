import {
  closeDb,
  createDb,
  type Database,
  outboxEvents,
  roles,
  seed,
  userRoles,
  users,
} from '@lg/db';
import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_ENV } from '../../test/env.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { hashPassword } from './crypto.js';

let t: TestApp;
let db: Database;
let tg = 920_000_000;
const PASSWORD = 'correct-horse-battery';
const ip = `10.9.${Math.floor(Math.random() * 250)}.1`;

const post = (url: string, payload: object, headers: Record<string, string> = {}) =>
  t.app.inject({ method: 'POST', url, payload, headers, remoteAddress: ip });
const login = (phone: string, password = PASSWORD) => post('/api/auth/login', { phone, password });
const confirm = (challengeId: string, telegramId: number) =>
  post(
    '/internal/auth/telegram/confirm',
    { challengeId, telegramId: String(telegramId) },
    { 'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN },
  );

async function director(linked: boolean) {
  tg += 1;
  const phone = `+99895${String(tg).slice(-7)}`;
  const [u] = await db
    .insert(users)
    .values({
      fullName: 'Direktor',
      phone,
      passwordHash: await hashPassword(PASSWORD),
      telegramId: linked ? BigInt(tg) : null,
    })
    .returning();
  const [r] = await db.select().from(roles).where(eq(roles.code, 'director'));
  await db.insert(userRoles).values({ userId: u!.id, roleId: r!.id });
  return { id: u!.id, phone, tg };
}

const prompts = async (userId: string) =>
  db
    .select()
    .from(outboxEvents)
    .where(
      sql`${outboxEvents.type} = 'StaffTelegramLoginRequested' and ${outboxEvents.payload}->>'userId' = ${userId}`,
    );

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Parol → MFA: Telegram tasdiq soʻrovi avtomatik (T-122)', () => {
  it('Telegram ulangan: kod bosqichi + botga soʻrov; bot tasdigʻi → sessiya', async () => {
    const d = await director(true);
    const res = await login(d.phone);
    const body = res.json<{ next: string; telegramChallengeId?: string }>();
    expect(body.next).toBe('totp_setup');
    expect(body.telegramChallengeId).toBeTruthy();
    expect(await prompts(d.id)).toHaveLength(1);

    const challengeId = body.telegramChallengeId!;
    const pending = await post('/api/auth/telegram/poll', { challengeId });
    expect(pending.statusCode).toBe(202);
    expect((await confirm(challengeId, d.tg)).json()).toEqual({ confirmed: true });
    const done = await post('/api/auth/telegram/poll', { challengeId });
    expect(done.statusCode).toBe(200);
    expect(done.cookies.some((c) => c.name === 'lg_rt')).toBe(true);
  });

  it('notoʻgʻri parol — soʻrov yuborilmaydi', async () => {
    const d = await director(true);
    expect((await login(d.phone, 'wrong-password-123')).statusCode).toBe(401);
    expect(await prompts(d.id)).toHaveLength(0);
  });

  it('Telegram ulanmagan — faqat kod (soʻrovsiz)', async () => {
    const d = await director(false);
    const body = (await login(d.phone)).json<{ telegramChallengeId?: string }>();
    expect(body.telegramChallengeId).toBeUndefined();
    expect(await prompts(d.id)).toHaveLength(0);
  });

  it('begona Telegram akkaunti tasdiqlay olmaydi', async () => {
    const d = await director(true);
    const { telegramChallengeId } = (await login(d.phone)).json<{ telegramChallengeId: string }>();
    expect((await confirm(telegramChallengeId, 1)).json()).toEqual({ confirmed: false });
    expect(
      (await post('/api/auth/telegram/poll', { challengeId: telegramChallengeId })).statusCode,
    ).toBe(202);
  });
});
