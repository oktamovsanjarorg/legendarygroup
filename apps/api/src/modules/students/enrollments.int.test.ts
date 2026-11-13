import type { RoleCode } from '@lg/contracts';
import { closeDb, createDb, type Database, seed } from '@lg/db';
import { addDays, formatDateToYmd } from '@lg/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createUserWithRole, tokenFor, tokensForAllRoles } from '../../test/role-tokens.js';
import { createRealTestApp, type TestApp } from '../../test/test-app.js';

let t: TestApp;
let db: Database;
let tokens: Map<RoleCode, string>;
let teacherToken = '';
const today = formatDateToYmd(new Date());
const start = addDays(today, -30);
const g = { small: '', big: '', tiny: '' };
const s: Record<string, string> = {};

type Method = 'GET' | 'POST' | 'DELETE';
const call = (method: Method, url: string, payload?: object, token = tokens.get('admin')!) =>
  t.app.inject({
    method,
    url: `/api/${url}`,
    payload,
    headers: { authorization: `Bearer ${token}` },
  });
const codeOf = (res: { json: <T>() => T }) => res.json<{ code: string }>().code;
const enroll = (student: string, group: string, startDate = start) =>
  call('POST', 'enrollments', { studentId: s[student], groupId: group, startDate });

interface Enr {
  id: string;
  state: string;
  endDate: string | null;
  endReason: string | null;
  freezes: { id: string; to: string }[];
}
const ids = (res: { json: <T>() => T }) =>
  res.json<{ items: { studentId?: string; id?: string }[] }>().items;

beforeAll(async () => {
  t = await createRealTestApp();
  await seed(t.db.url, { withTestDirector: false });
  db = createDb(t.db.url, { max: 2 });
  tokens = await tokensForAllRoles(t, db);
  const teacher = await createUserWithRole(db, 'teacher');
  teacherToken = await tokenFor(t, db, teacher, 'teacher');
  const idOf = async (url: string, body: object) =>
    (await call('POST', url, body)).json<{ id: string }>().id;
  const course = await idOf('courses', {
    name: 'IELTS',
    defaultMonthlyPrice: '650000',
    lessonDurationMin: 90,
  });
  const grp = (name: string, maxStudents: number, teachers: object[] = []) =>
    idOf('groups', { courseId: course, name, maxStudents, startDate: start, teachers });
  g.small = await grp('Kichik', 2, [{ teacherId: teacher, role: 'main' }]);
  g.big = await grp('Katta', 10);
  g.tiny = await grp('Bir oʻrin', 1);
  for (const n of ['Ali', 'Vali', 'Gani', 'Sami', 'Arxiv'])
    s[n] = await idOf('students', { fullName: `${n} Testov` });
  await call('POST', `students/${s['Arxiv']}/archive`);
});
afterAll(async () => {
  await closeDb(db);
  await t.close();
});

describe('Ruxsat (har endpoint forbidden)', () => {
  const x = '00000000-0000-4000-8000-000000000000';
  it.each(['teacher', 'guardian'] as const)('%s → yozish 403', async (role) => {
    const writes: [Method, string, object?][] = [
      ['POST', 'enrollments', { studentId: x, groupId: x, startDate: today }],
      ['POST', `enrollments/${x}/end`, { endDate: today, reason: 'left' }],
      ['POST', `enrollments/${x}/transfer`, { toGroupId: x, date: today }],
      ['POST', `enrollments/${x}/freezes`, { from: today, to: today, reason: 'Kasal' }],
      ['POST', `enrollments/${x}/freezes/${x}/end`, { to: today }],
      ['DELETE', `enrollments/${x}/freezes/${x}`],
    ];
    for (const [m, url, body] of writes)
      expect((await call(m, url, body, tokens.get(role)!)).statusCode, `${m} ${url}`).toBe(403);
  });
  it('ota-ona → guruh roʻyxati 403 (group.view yoʻq)', async () => {
    expect(
      (await call('GET', `groups/${g.small}/students`, undefined, tokens.get('guardian')!))
        .statusCode,
    ).toBe(403);
  });
});

describe('Yozish va sigʻim (FR-STU-3)', () => {
  it('yoziladi; takroriy davr — ALREADY_ENROLLED; guruhdan oldin — 400; arxivdagi — 409', async () => {
    const res = await enroll('Ali', g.small);
    expect(res.statusCode).toBe(201);
    expect(res.json<Enr>().state).toBe('active');
    expect(codeOf(await enroll('Ali', g.small, today))).toBe('ALREADY_ENROLLED');
    expect(codeOf(await enroll('Vali', g.small, addDays(start, -1)))).toBe('INVALID_DATE_RANGE');
    expect(codeOf(await enroll('Arxiv', g.big))).toBe('STUDENT_ARCHIVED');
  });

  it('sigʻim: toʻla — GROUP_FULL; rejalashtirilgan chiqishdan keyin — mumkin', async () => {
    const vali = (await enroll('Vali', g.small)).json<Enr>();
    expect(codeOf(await enroll('Gani', g.small, today))).toBe('GROUP_FULL');
    await call('POST', `enrollments/${vali.id}/end`, {
      endDate: addDays(today, 10),
      reason: 'left',
    });
    expect(codeOf(await enroll('Gani', g.small, today))).toBe('GROUP_FULL');
    expect((await enroll('Gani', g.small, addDays(today, 11))).statusCode).toBe(201);
  });

  it('parallel: 1 oʻrinli guruhga ikki soʻrov — faqat bittasi', async () => {
    const codes = (await Promise.all([enroll('Sami', g.tiny), enroll('Vali', g.tiny)])).map(
      (r) => r.statusCode,
    );
    expect(codes.sort()).toEqual([201, 409]);
  });
});

describe('Koʻchirish, chiqarish, roʻyxat (BR-32)', () => {
  let moved: Enr;

  it('koʻchirish: eski date-1 da (transferred), yangi date dan; takror — xato', async () => {
    const hist = (await call('GET', `students/${s['Ali']}/enrollments`)).json<Enr[]>();
    const res = await call('POST', `enrollments/${hist[0]!.id}/transfer`, {
      toGroupId: g.big,
      date: today,
    });
    moved = res.json<Enr>();
    expect(moved.state).toBe('active');
    const after = (await call('GET', `students/${s['Ali']}/enrollments`)).json<Enr[]>();
    expect(after.find((e) => e.id === hist[0]!.id)).toMatchObject({
      endDate: addDays(today, -1),
      endReason: 'transferred',
      state: 'ended',
    });
    expect(
      codeOf(
        await call('POST', `enrollments/${hist[0]!.id}/end`, { endDate: today, reason: 'left' }),
      ),
    ).toBe('ENROLLMENT_ENDED');
    expect(
      codeOf(
        await call('POST', `enrollments/${moved.id}/transfer`, {
          toGroupId: g.big,
          date: addDays(today, 1),
        }),
      ),
    ).toBe('SAME_GROUP');
  });

  it('roʻyxat sanada: kecha — Ali bor, bugun — yoʻq; groupId qidiruvi', async () => {
    const at = async (date: string) =>
      ids(await call('GET', `groups/${g.small}/students?date=${date}`)).map((i) => i.studentId);
    expect(await at(addDays(today, -1))).toEqual(expect.arrayContaining([s['Ali'], s['Vali']]));
    expect(await at(today)).not.toContain(s['Ali']);
    expect(ids(await call('GET', `students?groupId=${g.big}`)).map((i) => i.id)).toEqual([
      s['Ali'],
    ]);
  });

  it('guruhlar toʻlganligi: bugun yozilganlar soni; Ustoz — faqat oʻz guruhi; ota-ona — 403', async () => {
    const counts = async (token?: string) =>
      (await call('GET', 'groups/student-counts', undefined, token)).json<{
        date: string;
        counts: Record<string, number>;
      }>();
    const all = await counts();
    expect(all.date).toBe(today);
    for (const id of Object.values(g)) {
      const roster = ids(await call('GET', `groups/${id}/students`));
      expect(all.counts[id], id).toBe(roster.length);
    }
    expect(Object.keys((await counts(teacherToken)).counts)).toEqual([g.small]);
    expect(
      (await call('GET', 'groups/student-counts', undefined, tokens.get('guardian')!)).statusCode,
    ).toBe(403);
  });

  it('Ustoz: oʻz guruhi roʻyxati va oʻquvchilari; boshqa guruhga koʻchgan — 404', async () => {
    expect(
      (await call('GET', `groups/${g.small}/students`, undefined, teacherToken)).statusCode,
    ).toBe(200);
    expect(
      (await call('GET', `groups/${g.big}/students`, undefined, teacherToken)).statusCode,
    ).toBe(404);
    const visible = ids(await call('GET', 'students', undefined, teacherToken)).map((i) => i.id);
    expect(visible).toEqual([s['Vali']]);
    expect((await call('GET', `students/${s['Ali']}`, undefined, teacherToken)).statusCode).toBe(
      404,
    );
  });

  describe('Muzlatish (BR-9)', () => {
    const fz = (from: number, to: number) => ({
      from: addDays(today, from),
      to: addDays(today, to),
      reason: 'Kasalxona',
    });
    it('< 14 kun — rad; kelajakdagisi — bekor qilinadi; kesishuv — rad', async () => {
      expect(codeOf(await call('POST', `enrollments/${moved.id}/freezes`, fz(1, 10)))).toBe(
        'FREEZE_TOO_SHORT',
      );
      const res = await call('POST', `enrollments/${moved.id}/freezes`, fz(1, 20));
      expect(res.statusCode).toBe(201);
      const f = res.json<Enr>().freezes[0]!;
      expect(codeOf(await call('POST', `enrollments/${moved.id}/freezes`, fz(5, 25)))).toBe(
        'FREEZE_OVERLAP',
      );
      expect(
        (await call('DELETE', `enrollments/${moved.id}/freezes/${f.id}`)).json<Enr>().freezes,
      ).toEqual([]);
    });
    it('bugundan — holat frozen; boshlangan — bekor qilinmaydi, erta tugatiladi; chiqishda qirqiladi', async () => {
      const e = (await call('POST', `enrollments/${moved.id}/freezes`, fz(0, 30))).json<Enr>();
      expect(e.state).toBe('frozen');
      const f = e.freezes[0]!;
      expect(codeOf(await call('DELETE', `enrollments/${moved.id}/freezes/${f.id}`))).toBe(
        'FREEZE_STARTED',
      );
      const ended = await call('POST', `enrollments/${moved.id}/freezes/${f.id}/end`, {
        to: addDays(today, 20),
      });
      expect(ended.json<Enr>().freezes[0]?.to).toBe(addDays(today, 20));
      const left = await call('POST', `enrollments/${moved.id}/end`, {
        endDate: addDays(today, 15),
        reason: 'left',
      });
      expect(left.json<Enr>().freezes[0]?.to).toBe(addDays(today, 15));
    });
  });
});
