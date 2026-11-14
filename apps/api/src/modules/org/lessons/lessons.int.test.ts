import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { addDays, formatDateToYmd, holidayEffect, isoWeekday, lessonHorizon } from '@lg/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../../test/test-app.js';
import { LessonsCron } from './lessons-cron.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
const today = formatDateToYmd(new Date());
const horizon = lessonHorizon(today);
const ids = { course: '', room: '', room2: '', t1: '', t2: '', g: '', other: '' };
const tok = { t1: '', t2: '' };

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
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
  date: string;
  startTime: string;
  status: string;
  kind: string;
  teacher: { id: string } | null;
  isSubstitute: boolean;
  compensation: string | null;
  makeupLessonId: string | null;
  cancelSource: string | null;
}
const lessonsOf = async (groupId: string, token?: string) =>
  (
    await call(
      'GET',
      `lessons?from=${today}&to=${addDays(today, 61)}&groupId=${groupId}`,
      undefined,
      token,
    )
  ).json<L[]>();
/** Bugundan keyingi `weekday` kunlari gorizontgacha. */
const expectedDates = (weekday: number, to = horizon) => {
  const out: string[] = [];
  for (let d = today; d <= to; d = addDays(d, 1)) if (isoWeekday(d) === weekday) out.push(d);
  return out;
};
const runCron = () => t.app.get(LessonsCron).run();

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
  ids.room = await post('rooms', { name: '101-xona', capacity: 16 });
  ids.room2 = await post('rooms', { name: '202-xona', capacity: 16 });
  ids.t1 = await createUserWithRole(db, 'teacher');
  ids.t2 = await createUserWithRole(db, 'teacher');
  tok.t1 = await tokenFor(t, db, ids.t1, 'teacher');
  tok.t2 = await tokenFor(t, db, ids.t2, 'teacher');
  const group = (name: string, roomId: string, weekday: number, teacherId: string) =>
    post('groups', {
      courseId: ids.course,
      name,
      roomId,
      maxStudents: 12,
      startDate: addDays(today, -14),
      slots: [{ weekday, startTime: '09:00', endTime: '10:30' }],
      teachers: [{ teacherId, role: 'main' }],
    });
  ids.g = await group('Dushanba', ids.room, 1, ids.t1);
  ids.other = await group('Seshanba', ids.room2, 2, ids.t2);
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Ruxsat (har endpoint forbidden)', () => {
  const x = '00000000-0000-4000-8000-000000000000';
  const slot = { date: today, startTime: '09:00', endTime: '10:30' };
  it.each(['teacher', 'guardian'] as const)('%s → yozish 403', async (role) => {
    const writes: [Method, string, object?][] = [
      ['POST', 'lessons', { ...slot, groupId: x }],
      ['PATCH', `lessons/${x}`, { teacherId: null }],
      ['POST', `lessons/${x}/cancel`, { reason: 'Kasal' }],
      ['POST', `lessons/${x}/restore`],
      ['POST', `lessons/${x}/move`, slot],
      ['POST', `lessons/${x}/makeup`, slot],
      ['POST', 'holidays', { date: today, name: 'Bayram' }],
      ['DELETE', `holidays/${today}`],
    ];
    for (const [m, url, body] of writes)
      expect((await call(m, url, body, tokens.get(role)!)).statusCode, `${m} ${url}`).toBe(403);
  });
  it('ota-ona → kalendar 403', async () => {
    expect(
      (await call('GET', `lessons?from=${today}&to=${today}`, undefined, tokens.get('guardian')!))
        .statusCode,
    ).toBe(403);
  });
});

describe('Generatsiya (FR-ORG-5)', () => {
  it('bugundan gorizontgacha, oʻtmish generatsiya qilinmaydi; cron idempotent', async () => {
    const dates = (await lessonsOf(ids.g)).map((l) => l.date);
    expect(dates).toEqual(expectedDates(1).filter((d) => d <= addDays(today, 61)));
    const past = (
      await call(
        'GET',
        `lessons?from=${addDays(today, -14)}&to=${addDays(today, -1)}&groupId=${ids.g}`,
      )
    ).json<L[]>();
    expect(past).toEqual([]);
    await runCron();
    const again = await runCron();
    expect(again.created).toBe(0);
    expect((await lessonsOf(ids.g)).length).toBe(dates.length);
  });

  it('Ustoz kalendari: oʻz guruhi koʻrinadi, begonasi — yoʻq', async () => {
    const mine = (
      await call('GET', `lessons?from=${today}&to=${addDays(today, 20)}`, undefined, tok.t1)
    ).json<L[]>();
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((l) => l.teacher?.id === ids.t1)).toBe(true);
    const foreign = (await lessonsOf(ids.other))[0]!;
    expect((await call('GET', `lessons/${foreign.id}`, undefined, tok.t1)).statusCode).toBe(404);
  });
});

describe('Bekor qilish, koʻchirish, oʻrinbosar (BR-5, FR-ORG-6)', () => {
  it('bekor → cron qayta yaratmaydi → qaytarish; takroriy bekor — 409', async () => {
    const [first] = await lessonsOf(ids.g);
    const res = await call('POST', `lessons/${first!.id}/cancel`, { reason: 'Ustoz kasal' });
    expect(res.json<L>()).toMatchObject({
      status: 'cancelled',
      compensation: null,
      cancelSource: 'manual',
    });
    expect(codeOf(await call('POST', `lessons/${first!.id}/cancel`, { reason: 'Yana' }))).toBe(
      'LESSON_NOT_SCHEDULED',
    );
    await runCron();
    expect((await lessonsOf(ids.g)).filter((l) => l.date === first!.date)).toHaveLength(1);
    expect((await call('POST', `lessons/${first!.id}/restore`)).json<L>().status).toBe('scheduled');
  });

  it('koʻchirish: asl — bekor (makeup), yangisi — qoplovchi; band xonaga — LESSON_CONFLICT', async () => {
    const [, second] = await lessonsOf(ids.g);
    const target = expectedDates(2)[1]!;
    const clash = await call('POST', `lessons/${second!.id}/move`, {
      date: target,
      startTime: '10:00',
      endTime: '11:00',
      roomId: ids.room2,
    });
    expect([clash.statusCode, codeOf(clash)]).toEqual([409, 'LESSON_CONFLICT']);
    const moved = (
      await call('POST', `lessons/${second!.id}/move`, {
        date: target,
        startTime: '14:00',
        endTime: '15:30',
      })
    ).json<L>();
    expect(moved).toMatchObject({ status: 'cancelled', compensation: 'makeup' });
    const makeup = (await call('GET', `lessons/${moved.makeupLessonId!}`)).json<L>();
    expect(makeup).toMatchObject({
      kind: 'makeup',
      date: target,
      startTime: '14:00',
      status: 'scheduled',
    });
    expect(codeOf(await call('POST', `lessons/${second!.id}/restore`))).toBe(
      'LESSON_NOT_RESTORABLE',
    );
  });

  it('Q-66: kelajakdagi darsi bor xona arxivlanmaydi', async () => {
    const room = (await call('POST', 'rooms', { name: '303-xona', capacity: 20 })).json<{
      id: string;
    }>().id;
    const extra = {
      groupId: ids.g,
      roomId: room,
      date: addDays(today, 5),
      startTime: '18:00',
      endTime: '19:00',
    };
    expect((await call('POST', 'lessons', extra)).statusCode).toBe(201);
    expect(codeOf(await call('POST', `rooms/${room}/archive`))).toBe('HAS_ACTIVE_GROUPS');
  });

  it('oʻtgan sanaga qoʻshimcha dars — 400; kelajakka — 201', async () => {
    const body = { groupId: ids.g, startTime: '16:00', endTime: '17:00' };
    expect(codeOf(await call('POST', 'lessons', { ...body, date: addDays(today, -1) }))).toBe(
      'LESSON_IN_PAST',
    );
    const res = await call('POST', 'lessons', { ...body, date: addDays(today, 3) });
    expect([res.statusCode, res.json<L>().kind]).toEqual([201, 'extra']);
  });

  it('oʻrinbosar: faqat shu dars koʻrinadi; jadval qayta hisoblansa ham saqlanadi', async () => {
    const list = await lessonsOf(ids.g);
    const l = list.find((x) => x.status === 'scheduled' && x.kind === 'regular')!;
    const res = await call('PATCH', `lessons/${l.id}`, { teacherId: ids.t2 });
    expect(res.json<L>()).toMatchObject({ isSubstitute: true, teacher: { id: ids.t2 } });
    expect((await call('GET', `lessons/${l.id}`, undefined, tok.t2)).statusCode).toBe(200);
    const roster = await call('GET', `lessons/${l.id}/students`, undefined, tok.t2);
    expect([roster.statusCode, roster.json<{ date: string }>().date]).toEqual([200, l.date]);
    const otherOfGroup = list.find((x) => x.id !== l.id)!;
    expect((await call('GET', `lessons/${otherOfGroup.id}`, undefined, tok.t2)).statusCode).toBe(
      404,
    );
    expect(
      (await call('GET', `lessons/${otherOfGroup.id}/students`, undefined, tok.t2)).statusCode,
    ).toBe(404);
    await call('PATCH', `groups/${ids.g}`, { roomId: ids.room2 });
    const after = (await call('GET', `lessons/${l.id}`)).json<L & { room: { id: string } }>();
    expect(after).toMatchObject({
      isSubstitute: true,
      teacher: { id: ids.t2 },
      room: { id: ids.room2 },
    });
  });
});

describe('Jadval oʻzgarishi va bayramlar (BR-3)', () => {
  it('jadval sanadan: oldingi darslar oʻzgarmaydi, keyingilari yangi kunda', async () => {
    const from = addDays(today, 21);
    await call('PUT', `groups/${ids.g}/schedule`, {
      from,
      slots: [{ weekday: 4, startTime: '09:00', endTime: '10:30' }],
    });
    const list = (await lessonsOf(ids.g)).filter((l) => l.kind === 'regular');
    expect(list.filter((l) => l.date < from).every((l) => isoWeekday(l.date) === 1)).toBe(true);
    expect(list.filter((l) => l.date >= from).map((l) => l.date)).toEqual(
      expectedDates(4).filter((d) => d >= from && d <= addDays(today, 61)),
    );
  });

  it('bayram: joriy oy — bekor (holiday), keyingi oy — oʻchiriladi; olib tashlansa — qaytadi', async () => {
    const target = (await lessonsOf(ids.other)).find((l) => l.date > today)!;
    expect(
      (await call('POST', 'holidays', { date: target.date, name: 'Mustaqillik kuni' })).statusCode,
    ).toBe(201);
    expect(codeOf(await call('POST', 'holidays', { date: target.date, name: 'Takror' }))).toBe(
      'HOLIDAY_EXISTS',
    );
    const onDay = (await lessonsOf(ids.other)).filter((l) => l.date === target.date);
    if (holidayEffect(target.date, today) === 'cancel')
      expect(onDay).toMatchObject([{ status: 'cancelled', cancelSource: 'holiday' }]);
    else expect(onDay).toEqual([]);
    await runCron();
    expect((await lessonsOf(ids.other)).filter((l) => l.date === target.date)).toHaveLength(
      onDay.length,
    );
    expect((await call('DELETE', `holidays/${target.date}`)).statusCode).toBe(204);
    expect((await lessonsOf(ids.other)).filter((l) => l.date === target.date)).toMatchObject([
      { status: 'scheduled' },
    ]);
  });

  it('guruh yakunlansa — kelajakdagi jadval darslari oʻchiriladi', async () => {
    await call('POST', `groups/${ids.other}/status`, { status: 'active' });
    await call('POST', `groups/${ids.other}/status`, { status: 'finished' });
    expect((await lessonsOf(ids.other)).filter((l) => l.date > today)).toEqual([]);
  });
});
