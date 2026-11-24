import {
  closeDb,
  createDb,
  type Database,
  guardianLinkRequests,
  guardians,
  seed,
  users,
} from '@lg/db';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_ENV } from '../../test/env.js';
import { createUserWithRole, tokenFor } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

/** Q-98: Telegram — yagona kalit, shuning uchun xodim profilini ota-ona oqimi orqali egallab bo'lmaydi. */
describe('Xavfsizlik: xodim Telegramini ota-ona oqimi orqali egallash (Q-98)', () => {
  let t: TestApp;
  let db: Database;
  let admin: string;
  let directorId: string;
  let directorToken: string;
  const ATTACKER = 666001n;
  const DIRECTOR_TG = 555001n;

  beforeAll(async () => {
    t = await createRealTestApp();
    await seed(t.db.url, { withTestDirector: false });
    db = createDb(t.db.url, { max: 2 });
    admin = await tokenFor(t, db, await createUserWithRole(db, 'admin'), 'admin');
    directorId = await createUserWithRole(db, 'director');
    await db.update(users).set({ telegramId: DIRECTOR_TG }).where(eq(users.id, directorId));
    directorToken = await tokenFor(t, db, directorId, 'director');
  });
  afterAll(async () => {
    await closeDb(db);
    await t.close();
  });

  const row = async (id: string) => (await db.select().from(users).where(eq(users.id, id)))[0]!;
  const approve = (requestId: string, guardianId: string) =>
    t.app.inject({
      method: 'POST',
      url: `/api/guardians/link-requests/${requestId}/approve`,
      headers: { authorization: `Bearer ${admin}` },
      payload: { guardianId },
    });
  const request = async (telegramId: bigint, phone: string) =>
    (
      await db
        .insert(guardianLinkRequests)
        .values({ telegramId, phone, fullName: 'Begona' })
        .returning()
    )[0]!.id;
  const contact = (telegramId: bigint, phone: string) =>
    t.app.inject({
      method: 'POST',
      url: '/internal/guardian/contact',
      headers: { 'x-internal-token': TEST_ENV.INTERNAL_API_TOKEN },
      payload: { telegramId: String(telegramId), phone, fullName: 'Begona' },
    });

  it('Admin direktor raqami bilan ota-ona yaratib, begona soʻrovni tasdiqlay olmaydi', async () => {
    const { phone } = await row(directorId);
    const [g] = await db.insert(guardians).values({ fullName: 'Soxta', phone }).returning();
    const res = await approve(await request(ATTACKER, '+998900000666'), g!.id);
    expect(res.statusCode).toBe(409);
    expect((await row(directorId)).telegramId).toBe(DIRECTOR_TG);
  });

  it('ulanmagan xodim ham: soʻrov raqami xodimniki boʻlmasa — rad', async () => {
    const id = await createUserWithRole(db, 'teacher');
    const { phone } = await row(id);
    const [g] = await db.insert(guardians).values({ fullName: 'Soxta', phone }).returning();
    const res = await approve(await request(ATTACKER, '+998900000667'), g!.id);
    expect(res.statusCode).toBe(409);
    expect((await row(id)).telegramId).toBeNull();
  });

  it('ota-ona raqami oʻzgartirilib, botdan ulashilsa ham direktor Telegrami oʻzgarmaydi', async () => {
    await db
      .update(guardians)
      .set({ userId: directorId, phone: '+998900000668' })
      .where(eq(guardians.phone, (await row(directorId)).phone));
    const res = await contact(ATTACKER, '+998900000668');
    expect(res.json()).toEqual({ result: 'conflict' });
    expect((await row(directorId)).telegramId).toBe(DIRECTOR_TG);
  });

  it('band Telegram — 500 emas, conflict', async () => {
    await db.insert(guardians).values({ fullName: 'Ona', phone: '+998900000669' });
    const res = await contact(DIRECTOR_TG, '+998900000669');
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ result: 'conflict' });
    const orphan = await db.select().from(users).where(eq(users.phone, '+998900000669'));
    expect(orphan).toHaveLength(0);
  });

  it('oddiy ota-ona oqimi ishlaydi: yangi Telegram bilan qayta ulanish', async () => {
    await db.insert(guardians).values({ fullName: 'Ota', phone: '+998900000670' });
    expect((await contact(777001n, '+998900000670')).json()).toMatchObject({
      result: 'guardian_linked',
    });
    expect((await contact(777002n, '+998900000670')).json()).toMatchObject({
      result: 'guardian_linked',
    });
  });

  it('ota-onaga xodim roli berilsa — tasdiqlanmagan Telegram uziladi, raqam qayta ulashiladi', async () => {
    const id = await createUserWithRole(db, 'guardian');
    await db.update(users).set({ telegramId: ATTACKER }).where(eq(users.id, id));
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/staff',
      headers: { authorization: `Bearer ${directorToken}` },
      payload: { phone: (await row(id)).phone, fullName: 'Yangi Admin', role: 'admin' },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ id, botUrl: 'https://t.me/legendary_test_bot' });
    expect((await row(id)).telegramId).toBeNull();
  });

  it('xodimga ikkinchi rol — Telegrami uzilmaydi', async () => {
    const id = await createUserWithRole(db, 'teacher');
    await db.update(users).set({ telegramId: 888001n }).where(eq(users.id, id));
    const res = await t.app.inject({
      method: 'POST',
      url: `/api/staff/${id}/roles`,
      headers: { authorization: `Bearer ${directorToken}` },
      payload: { role: 'admin' },
    });
    expect(res.json()).toMatchObject({ botUrl: null });
    expect((await row(id)).telegramId).toBe(888001n);
  });
});
