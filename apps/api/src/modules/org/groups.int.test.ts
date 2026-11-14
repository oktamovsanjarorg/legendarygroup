import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
const ids = { course: '', room101: '', room204: '', t1: '', t2: '', admin: '' };
const today = formatDateToYmd(new Date());
const start = addDays(today, -30);

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT';
const call = (method: Method, url: string, payload?: object, role: RoleCode = 'admin') =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${tokens.get(role)!}` },
  });
const codeOf = (res: { json: <T>() => T }) => res.json<{ code: string }>().code;
const mon = (startTime: string, endTime: string) => ({ weekday: 1, startTime, endTime });

interface Detail {
  id: string;
  monthlyPrice: string;
  status: string;
  mainTeacher: { id: string } | null;
  slots: { startTime: string }[];
  schedule: { validFrom: string; validTo: string | null }[];
  teachers: { id: string; teacherId: string; role: string; to: string | null }[];
}

const group = (name: string, over: object = {}) => ({
  courseId: ids.course,
  name,
  roomId: ids.room101,
  maxStudents: 12,
  startDate: start,
  slots: [mon('09:00', '10:30')],
  teachers: [{ teacherId: ids.t1, role: 'main' }],
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
  ids.room101 = await post('rooms', { name: '101-xona', capacity: 16 });
  ids.room204 = await post('rooms', { name: '204-xona', capacity: 20 });
  ids.t1 = await createUserWithRole(db, 'teacher');
  ids.t2 = await createUserWithRole(db, 'teacher');
  ids.admin = await createUserWithRole(db, 'admin');
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Ruxsat (CLAUDE.md: har endpoint forbidden)', () => {
  const someId = '00000000-0000-4000-8000-000000000000';
  const writes: [Method, string, object][] = [
    ['POST', 'groups', {}],
    ['PATCH', `groups/${someId}`, { name: 'X guruh' }],
    ['POST', `groups/${someId}/status`, { status: 'active' }],
    ['PUT', `groups/${someId}/schedule`, { from: today, slots: [] }],
    ['POST', `groups/${someId}/teachers`, { teacherId: someId, role: 'main', from: today }],
    ['POST', `groups/${someId}/teachers/${someId}/end`, { to: today }],
  ];
  it.each(['teacher', 'guardian'] as const)('%s → yozish 403', async (role) => {
    for (const [m, url, body] of writes)
      expect((await call(m, url, body, role)).statusCode, `${m} ${url}`).toBe(403);
  });
  it('ota-ona → oʻqish ham 403 (group.view yoʻq)', async () => {
    expect((await call('GET', 'groups', undefined, 'guardian')).statusCode).toBe(403);
  });
});

describe('Yaratish va toʻqnashuv (FR-ORG-3/4)', () => {
  let a: Detail;

  it('narx kursdan meros, asosiy ustoz va bugungi jadval', async () => {
    const res = await call('POST', 'groups', group('IELTS B2-1'));
    expect(res.statusCode).toBe(201);
    a = res.json<Detail>();
    expect(a).toMatchObject({
      monthlyPrice: '650000',
      status: 'forming',
      mainTeacher: { id: ids.t1 },
    });
    expect(a.slots.map((s) => s.startTime)).toEqual(['09:00']);
  });

  it('xona band → 409 SCHEDULE_CONFLICT (qaysi guruh bilan)', async () => {
    const res = await call(
      'POST',
      'groups',
      group('IELTS B2-2', { slots: [mon('10:00', '11:00')], teachers: [] }),
    );
    expect(codeOf(res)).toBe('SCHEDULE_CONFLICT');
    const conflicts = res.json<{ details: { conflicts: { kind: string; groupName: string }[] } }>()
      .details.conflicts;
    expect(conflicts[0]).toMatchObject({ kind: 'room', groupName: 'IELTS B2-1' });
  });

  it('ustoz band (boshqa xonada) → 409, kind=teacher', async () => {
    const res = await call('POST', 'groups', group('IELTS B2-3', { roomId: ids.room204 }));
    expect(
      res.json<{ details: { conflicts: { kind: string }[] } }>().details.conflicts[0]?.kind,
    ).toBe('teacher');
  });

  it('[start, end): ketma-ket vaqt va boshqa kun — mumkin; davrlar kesishmasa — mumkin', async () => {
    expect(
      (await call('POST', 'groups', group('Ketma-ket', { slots: [mon('10:30', '12:00')] })))
        .statusCode,
    ).toBe(201);
    expect(
      (
        await call(
          'POST',
          'groups',
          group('Seshanba', { slots: [{ weekday: 2, startTime: '09:00', endTime: '10:30' }] }),
        )
      ).statusCode,
    ).toBe(201);
    const wed = [{ weekday: 3, startTime: '09:00', endTime: '10:30' }];
    const first = group('Kuz', {
      roomId: ids.room204,
      slots: wed,
      teachers: [],
      endDate: addDays(start, 60),
    });
    const next = group('Qish', {
      roomId: ids.room204,
      slots: wed,
      teachers: [],
      startDate: addDays(start, 61),
    });
    expect((await call('POST', 'groups', first)).statusCode).toBe(201);
    expect((await call('POST', 'groups', next)).statusCode).toBe(201);
    const overlap = group('Kesishgan', {
      roomId: ids.room204,
      slots: wed,
      teachers: [],
      startDate: addDays(start, 60),
    });
    expect(codeOf(await call('POST', 'groups', overlap))).toBe('SCHEDULE_CONFLICT');
  });

  it('parallel toʻqnashuvchi soʻrovlar — faqat bittasi', async () => {
    const body = (n: number) =>
      group(`Parallel ${n}`, { roomId: ids.room204, slots: [mon('15:00', '16:00')], teachers: [] });
    const codes = (await Promise.all([1, 2, 3].map((n) => call('POST', 'groups', body(n))))).map(
      (r) => r.statusCode,
    );
    expect(codes.sort()).toEqual([201, 409, 409]);
  });

  it.each([
    [
      'slotlar kesishadi',
      { slots: [mon('13:00', '14:00'), mon('13:30', '14:30')] },
      400,
      'SLOT_OVERLAP',
    ],
    ['xona sigʻimi', { maxStudents: 40, slots: [] }, 409, 'ROOM_CAPACITY_EXCEEDED'],
    [
      'ustoz emas',
      { slots: [], teachers: [{ teacherId: '', role: 'main' }] },
      400,
      'NOT_A_TEACHER',
    ],
    ['ikki asosiy', { slots: [], teachers: [] }, 400, 'MULTIPLE_MAIN_TEACHERS'],
  ])('validatsiya: %s', async (name, over, status, code) => {
    const body = group(`V ${name}`, over);
    if (code === 'NOT_A_TEACHER') body.teachers = [{ teacherId: ids.admin, role: 'main' }];
    if (code === 'MULTIPLE_MAIN_TEACHERS')
      body.teachers = [
        { teacherId: ids.t1, role: 'main' },
        { teacherId: ids.t2, role: 'main' },
      ];
    const res = await call('POST', 'groups', body);
    expect([res.statusCode, codeOf(res)]).toEqual([status, code]);
  });

  it('kursni arxivlash — yakunlanmagan guruh bor (Q-66)', async () => {
    expect(codeOf(await call('POST', `courses/${ids.course}/archive`))).toBe('HAS_ACTIVE_GROUPS');
    expect(codeOf(await call('POST', `rooms/${ids.room101}/archive`))).toBe('HAS_ACTIVE_GROUPS');
  });

  it('holatlar: forming → paused taqiq; finished — bandlik boʻshaydi, tahrir taqiq', async () => {
    expect(codeOf(await call('POST', `groups/${a.id}/status`, { status: 'paused' }))).toBe(
      'INVALID_STATUS_TRANSITION',
    );
    expect((await call('POST', `groups/${a.id}/status`, { status: 'active' })).statusCode).toBe(
      200,
    );
    const fin = await call('POST', `groups/${a.id}/status`, { status: 'finished' });
    expect(fin.json<{ status: string; endDate: string }>()).toMatchObject({
      status: 'finished',
      endDate: today,
    });
    const reuse = group('Oʻrniga', { startDate: addDays(today, 1), teachers: [] });
    expect((await call('POST', 'groups', reuse)).statusCode).toBe(201);
    expect(codeOf(await call('PATCH', `groups/${a.id}`, { name: 'Boshqa' }))).toBe(
      'GROUP_FINISHED',
    );
  });
});

describe('Jadval va ustoz almashtirish (FR-ORG-6)', () => {
  let g: Detail;
  beforeAll(async () => {
    const body = group('Almashtirish', {
      roomId: ids.room204,
      slots: [{ weekday: 5, startTime: '18:00', endTime: '19:30' }],
      teachers: [{ teacherId: ids.t2, role: 'main' }],
    });
    g = (await call('POST', 'groups', body)).json<Detail>();
  });

  it('jadval sanadan: eski slot from-1 da yopiladi, yangisi from dan', async () => {
    const res = await call('PUT', `groups/${g.id}/schedule`, {
      from: today,
      slots: [{ weekday: 6, startTime: '10:00', endTime: '11:30' }],
    });
    expect(res.statusCode).toBe(200);
    const d = res.json<Detail>();
    expect(d.schedule).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ validFrom: start, validTo: addDays(today, -1) }),
        expect.objectContaining({ validFrom: today, validTo: null }),
      ]),
    );
    expect(d.slots.map((s) => s.startTime)).toEqual(['10:00']);
  });

  it('yangi asosiy ustoz — eskisi from-1 da yopiladi; boshlanishdan oldingi sana — 400', async () => {
    const res = await call('POST', `groups/${g.id}/teachers`, {
      teacherId: ids.t1,
      role: 'main',
      from: today,
    });
    const d = res.json<Detail>();
    expect(d.mainTeacher?.id).toBe(ids.t1);
    expect(d.teachers.find((x) => x.teacherId === ids.t2)?.to).toBe(addDays(today, -1));
    const early = await call('POST', `groups/${g.id}/teachers`, {
      teacherId: ids.t2,
      role: 'assistant',
      from: addDays(start, -1),
    });
    expect(codeOf(early)).toBe('INVALID_DATE_RANGE');
  });

  it('biriktirishni yakunlash', async () => {
    const d = (await call('GET', `groups/${g.id}`)).json<Detail>();
    const main = d.teachers.find((x) => x.teacherId === ids.t1)!;
    const res = await call('POST', `groups/${g.id}/teachers/${main.id}/end`, {
      to: addDays(today, 10),
    });
    expect(res.json<Detail>().teachers.find((x) => x.id === main.id)?.to).toBe(addDays(today, 10));
  });
});
