import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, leads, seed } from '@lg/db';
import { addDays, formatDateToYmd, isoWeekday } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { tokensForAllRoles } from '../../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
const today = formatDateToYmd(new Date());
const ids = { course: '', group: '', tiny: '', lesson: '' };
/** Har ishga tushishda yangi telefonlar/IP — Redis limit hisoblagichlari to'qnashmasin. */
const run = String(Date.now()).slice(-6);
const phone = (n: number) => `+99893${run}${String(n).padStart(1, '0')}`;
const randomIp = () =>
  `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

type Method = 'GET' | 'POST' | 'PATCH';
const call = (method: Method, url: string, payload?: object, token = tokens.get('admin')!) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });
const codeOf = (res: { json: <T>() => T }) => res.json<{ code: string }>().code;

interface L {
  id: string;
  status: string;
  phone: string;
  studentId: string | null;
  trial: { lessonId: string; date: string } | null;
}
const create = (n: number, over: object = {}) =>
  call('POST', 'leads', {
    fullName: `Lid ${n} Testov`,
    phone: phone(n),
    source: 'instagram',
    ...over,
  });

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const post = async (url: string, body: object) =>
    (await call('POST', url, body)).json<{ id: string }>().id;
  ids.course = await post('courses', {
    name: 'IELTS',
    defaultMonthlyPrice: '650000',
    lessonDurationMin: 90,
  });
  const weekday = isoWeekday(addDays(today, 1));
  const group = (name: string, maxStudents: number) =>
    post('groups', {
      courseId: ids.course,
      name,
      maxStudents,
      startDate: today,
      slots: [
        {
          weekday,
          startTime: maxStudents > 1 ? '09:00' : '15:00',
          endTime: maxStudents > 1 ? '10:30' : '16:30',
        },
      ],
    });
  ids.group = await group('IELTS sinov', 10);
  ids.tiny = await group('Bir oʻrin', 1);
  const lessons = (
    await call('GET', `lessons?from=${today}&to=${addDays(today, 7)}&groupId=${ids.group}`)
  ).json<{ id: string }[]>();
  ids.lesson = lessons[0]!.id;
  const filler = await post('students', { fullName: 'Toʻldiruvchi Testov' });
  await call('POST', 'enrollments', { studentId: filler, groupId: ids.tiny, startDate: today });
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Ruxsat (har endpoint forbidden)', () => {
  const x = '00000000-0000-4000-8000-000000000000';
  it.each(['teacher', 'guardian'] as const)('%s → 403', async (role) => {
    const all: [Method, string, object?][] = [
      ['GET', 'leads'],
      ['GET', `leads/stats?from=${today}&to=${today}`],
      ['GET', `leads/${x}`],
      ['POST', 'leads', { fullName: 'Ali Valiyev', phone: '+998901234567' }],
      ['PATCH', `leads/${x}`, { notes: 'x' }],
      ['POST', `leads/${x}/status`, { status: 'contacted' }],
      ['POST', `leads/${x}/trial`, { lessonId: x }],
      ['POST', `leads/${x}/convert`, {}],
    ];
    for (const [m, url, body] of all)
      expect((await call(m, url, body, tokens.get(role)!)).statusCode, `${m} ${url}`).toBe(403);
  });
});

describe('Lid va holatlar (FR-STU-4)', () => {
  it('yaratiladi; boshqa yozuvdagi shu telefon — LEAD_EXISTS (leadId bilan)', async () => {
    const a = (await create(1)).json<L>();
    expect(a).toMatchObject({ status: 'new', phone: phone(1) });
    const local = phone(1)
      .replace('+998', '')
      .replace(/^(\d{2})(\d{3})(\d{2})(\d{2})$/, '$1 $2-$3-$4');
    const dup = await create(9, { phone: local });
    expect([codeOf(dup), dup.json<{ details: { leadId: string } }>().details.leadId]).toEqual([
      'LEAD_EXISTS',
      a.id,
    ]);
  });

  it('oqim: won qoʻlda — 400; lost sababsiz — 400; trial → new — 409; lost → new — qayta ochiladi', async () => {
    const l = (await create(2)).json<L>();
    const st = (body: object) => call('POST', `leads/${l.id}/status`, body);
    expect((await st({ status: 'won' })).statusCode).toBe(400);
    expect((await st({ status: 'lost' })).statusCode).toBe(400);
    expect((await st({ status: 'trial' })).json<L>().status).toBe('trial');
    expect(codeOf(await st({ status: 'new' }))).toBe('INVALID_STATUS_TRANSITION');
    expect((await st({ status: 'lost', lostReason: 'Narx qimmat' })).json<L>().status).toBe('lost');
    expect(codeOf(await call('PATCH', `leads/${l.id}`, { notes: 'x' }))).toBe('LEAD_CLOSED');
    expect((await st({ status: 'new' })).json<L>().status).toBe('new');
  });

  it('sinov darsi: rejalashtirilgan dars — trial; mavjud boʻlmagan — 400', async () => {
    const l = (await create(3)).json<L>();
    const res = (await call('POST', `leads/${l.id}/trial`, { lessonId: ids.lesson })).json<L>();
    expect(res).toMatchObject({ status: 'trial', trial: { lessonId: ids.lesson } });
    const bad = await call('POST', `leads/${l.id}/trial`, {
      lessonId: '00000000-0000-4000-8000-000000000000',
    });
    expect(bad.statusCode).toBe(400);
  });
});

describe('Oʻquvchiga aylantirish (bitta tranzaksiya)', () => {
  it('guruh toʻla — hech narsa saqlanmaydi (oʻquvchi ham yoʻq)', async () => {
    const l = (await create(4)).json<L>();
    const res = await call('POST', `leads/${l.id}/convert`, {
      enroll: { groupId: ids.tiny, startDate: today },
    });
    expect(codeOf(res)).toBe('GROUP_FULL');
    expect((await call('GET', `leads/${l.id}`)).json<L>()).toMatchObject({
      status: 'new',
      studentId: null,
    });
    const found = (await call('GET', `students?q=${encodeURIComponent('Lid 4 Testov')}`)).json<{
      items: unknown[];
    }>();
    expect(found.items).toEqual([]);
  });

  it('maʼlumot koʻchadi, guruhga yoziladi; takror — LEAD_CLOSED', async () => {
    const l = (await create(5, { notes: 'Kechqurun qoʻngʻiroq' })).json<L>();
    const res = await call('POST', `leads/${l.id}/convert`, {
      student: { birthDate: '2012-03-04' },
      enroll: { groupId: ids.group, startDate: today },
    });
    const won = res.json<L>();
    expect(won.status).toBe('won');
    const s = (await call('GET', `students/${won.studentId!}`)).json<Record<string, unknown>>();
    expect(s).toMatchObject({
      fullName: 'Lid 5 Testov',
      phone: phone(5),
      source: 'instagram',
      birthDate: '2012-03-04',
    });
    const hist = (await call('GET', `students/${won.studentId!}/enrollments`)).json<
      { group: { id: string } }[]
    >();
    expect(hist.map((e) => e.group.id)).toEqual([ids.group]);
    expect(codeOf(await call('POST', `leads/${l.id}/convert`, {}))).toBe('LEAD_CLOSED');
    expect((await create(5)).statusCode).toBe(201);
  });

  it('statistika: manba boʻyicha voronka (trial tarixi saqlanadi)', async () => {
    const stats = (await call('GET', `leads/stats?from=${today}&to=${today}`)).json<{
      total: { total: number; won: number; trial: number; conversionPercent: number };
    }>();
    expect(stats.total).toMatchObject({ total: 6, won: 1, trial: 2 });
    expect(stats.total.conversionPercent).toBeCloseTo(16.7, 1);
  });
});

describe('Landing formasi (W-35, ochiq)', () => {
  const submit = (body: object, ip = randomIp()) =>
    t.app.inject({ method: 'POST', url: '/api/public/leads', payload: body, remoteAddress: ip });
  it('202; manba — website; bot tuzogʻi va takror — lid yaratilmaydi, javob bir xil', async () => {
    expect(
      (await submit({ fullName: 'Sayt Mehmon', phone: phone(6), comment: 'IELTS' })).statusCode,
    ).toBe(202);
    const [row] = await db
      .select()
      .from(leads)
      .where(eq(leads.phone, phone(6)));
    expect(row).toMatchObject({ source: 'website', notes: 'IELTS', status: 'new' });
    expect((await submit({ fullName: 'Sayt Mehmon', phone: phone(6) })).statusCode).toBe(202);
    expect(
      (await submit({ fullName: 'Bot', phone: phone(7), website: 'http://spam' })).statusCode,
    ).toBe(202);
    expect(await db.$count(leads, eq(leads.phone, phone(6)))).toBe(1);
    expect(await db.$count(leads, eq(leads.phone, phone(7)))).toBe(0);
  });
  it('IP limiti: 5 tadan keyin 429', async () => {
    const ip = randomIp();
    for (let i = 0; i < 5; i++)
      expect(
        (await submit({ fullName: 'Mehmon Testov', phone: `+99894${run}${i}` }, ip)).statusCode,
      ).toBe(202);
    const res = await submit({ fullName: 'Mehmon Testov', phone: phone(8) }, ip);
    expect([res.statusCode, codeOf(res)]).toEqual([429, 'TOO_MANY_REQUESTS']);
  });
});
