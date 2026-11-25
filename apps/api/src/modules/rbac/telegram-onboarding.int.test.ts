import type { RoleCode, TelegramAuthResult } from '@lg/contracts';
import { closeDb, createDb, type Database, guardianLinkRequests, seed } from '@lg/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { TEST_ENV } from '../../test/env.js';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';
import { signInitData } from '../auth/telegram-init-data.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let tg = 910_000_000;
let studentCode = '';

const now = () => String(Math.floor(Date.now() / 1000));
const initDataFor = (id: number) =>
  signInitData(
    { auth_date: now(), user: JSON.stringify({ id, first_name: 'Ali', username: `u${id}` }) },
    TEST_ENV.TELEGRAM_BOT_TOKEN,
  );
/** `requestContact` javobi — Telegram imzolagan kontakt. */
const contactFor = (id: number, phone: string, token: string = TEST_ENV.TELEGRAM_BOT_TOKEN) =>
  signInitData(
    {
      auth_date: now(),
      contact: JSON.stringify({ user_id: id, phone_number: phone, first_name: 'Ali' }),
    },
    token,
  );
const post = (url: string, payload: object) =>
  t.app.inject({ method: 'POST', url: `/api/${url}`, payload });
const signIn = async (id: number) => post('auth/telegram', { initData: initDataFor(id) });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const admin = { authorization: `Bearer ${tokens.get('admin') ?? ''}` };
  const created = await t.app.inject({
    method: 'POST',
    url: '/api/students',
    headers: admin,
    payload: {
      fullName: 'Karimov Bola',
      guardians: [{ fullName: 'Karimova Ona', phone: '+998931234567', relation: 'mother' }],
    },
  });
  // O'quvchi oqimi uchun alohida oila: ota-ona raqami boshqa Telegram'ga bog'lanmagan bo'lsin.
  const pupil = await t.app.inject({
    method: 'POST',
    url: '/api/students',
    headers: admin,
    payload: {
      fullName: 'Toshmatov Oʻquvchi',
      guardians: [{ fullName: 'Toshmatova Ona', phone: '+998935556677', relation: 'mother' }],
    },
  });
  expect(created.statusCode).toBe(201);
  const { id } = pupil.json<{ id: string }>();
  const issued = await t.app.inject({
    method: 'POST',
    url: `/api/students/${id}/access-code`,
    headers: admin,
  });
  studentCode = issued.json<{ code: string }>().code;
});

afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Q-111: Mini App ichida bogʻlanish (botsiz)', () => {
  it('ota-ona: raqami bazada — darhol bogʻlanadi va kiradi', async () => {
    const id = (tg += 1);
    expect((await signIn(id)).json<{ code: string }>().code).toBe('TELEGRAM_NOT_LINKED');
    const res = await post('auth/telegram/contact', {
      initData: initDataFor(id),
      contact: contactFor(id, '+998931234567'),
    });
    expect(res.json()).toEqual({ result: 'linked' });
    const r = (await signIn(id)).json<TelegramAuthResult>();
    expect(r.next === 'done' && r.user.activeRole).toBe('guardian');
  });

  it('xodim: raqami bazada — bogʻlanadi', async () => {
    const id = (tg += 1);
    await createUserWithRole(db, 'teacher', '+998932223344');
    const res = await post('auth/telegram/contact', {
      initData: initDataFor(id),
      contact: contactFor(id, '998932223344'),
    });
    expect(res.json()).toEqual({ result: 'linked' });
    expect((await signIn(id)).statusCode).toBe(200);
  });

  it('nomaʼlum raqam: avval not_found, tanlasa — soʻrov (xodim tasdiqlaydi)', async () => {
    const id = (tg += 1);
    const body = { initData: initDataFor(id), contact: contactFor(id, '+998939998877') };
    expect((await post('auth/telegram/contact', body)).json()).toEqual({ result: 'not_found' });
    const res = await post('auth/telegram/contact', { ...body, createRequest: true });
    expect(res.json()).toEqual({ result: 'request_created' });
    expect((await db.select().from(guardianLinkRequests)).length).toBeGreaterThan(0);
    expect((await signIn(id)).json<{ code: string }>().code).toBe('TELEGRAM_NOT_LINKED');
  });

  it('boshqa odamning kontakti yoki soxta imzo — rad (INVALID_CONTACT)', async () => {
    const id = (tg += 1);
    for (const contact of [
      contactFor(id + 500, '+998931234567'),
      contactFor(id, '+998931234567', '1:fake_token_xxxxxxxxxxxxxxxxxxxx'),
    ]) {
      const res = await post('auth/telegram/contact', { initData: initDataFor(id), contact });
      expect(res.statusCode).toBe(400);
      expect(res.json<{ code: string }>().code).toBe('INVALID_CONTACT');
    }
    const bad = await post('auth/telegram/contact', {
      initData: 'auth_date=1&hash=00',
      contact: contactFor(id, '+998931234567'),
    });
    expect(bad.statusCode).toBe(401);
  });

  it('oʻquvchi: ota-ona raqami + kod — bogʻlanadi; notoʻgʻri kod — invalid', async () => {
    const id = (tg += 1);
    const base = { initData: initDataFor(id), contact: contactFor(id, '+998935556677') };
    const wrong = await post('auth/telegram/student', {
      ...base,
      code: '000000' === studentCode ? '111111' : '000000',
    });
    expect(wrong.json<{ result: string }>().result).toBe('invalid');
    const ok = await post('auth/telegram/student', { ...base, code: studentCode });
    expect(ok.json<{ result: string }>().result).toBe('linked');
    const r = (await signIn(id)).json<TelegramAuthResult>();
    expect(r.next === 'done' && r.user.activeRole).toBe('student');
  });
});
