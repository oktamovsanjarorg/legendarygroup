import type { GroupDetail, GroupListItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { blocksOf, createBody, emptyDraft, scheduleText, slotsOf } from './group-draft.js';

const COURSE = '0190a000-0000-7000-8000-0000000000c1';
const ROOM = '0190a000-0000-7000-8000-0000000000a1';
const TEACHER = '0190a000-0000-7000-8000-0000000000b1';
const slot = (weekday: number, startTime = '15:00', endTime = '16:30') => ({
  id: `s${weekday}${startTime}`,
  weekday,
  startTime,
  endTime,
  validFrom: '2026-11-01',
  validTo: null,
});
const group: GroupListItem = {
  id: 'g1',
  name: 'IELTS 7.0 — B2-guruh',
  status: 'active',
  course: { id: COURSE, name: 'Ingliz tili' },
  room: { id: ROOM, name: '204-xona' },
  monthlyPrice: '650000',
  maxStudents: 20,
  startDate: '2026-11-01',
  endDate: null,
  mainTeacher: { id: TEACHER, fullName: 'Karimov Rustam' },
  slots: [slot(1), slot(3), slot(5)],
};
const detail: GroupDetail = {
  ...group,
  gradingConfig: { scale: '0_5', kinds: [] },
  teachers: [
    {
      id: 'a1',
      teacherId: TEACHER,
      fullName: 'Karimov Rustam',
      role: 'main',
      from: '2026-11-01',
      to: null,
    },
  ],
  schedule: group.slots,
  createdAt: '2026-11-01T05:00:00Z',
  updatedAt: '2026-11-01T05:00:00Z',
};
const conflict = {
  code: 'SCHEDULE_CONFLICT',
  message: 'Jadvalda toʻqnashuv bor.',
  details: {
    conflicts: [
      {
        kind: 'room',
        resourceId: ROOM,
        groupId: 'g1',
        groupName: group.name,
        weekday: 1,
        startTime: '15:00',
        endTime: '16:30',
      },
    ],
  },
};

const lists: Record<string, unknown> = {
  '/groups?status=current': [group],
  '/groups/student-counts': { date: '2026-11-13', counts: { g1: 20 } },
  '/groups/g1': detail,
  '/groups/g1/students': { date: '2026-11-13', capacity: 20, items: [] },
  '/courses?status=active': [{ id: COURSE, name: 'Ingliz tili' }],
  '/rooms?status=active': [{ id: ROOM, name: '204-xona' }],
  '/teachers': [{ id: TEACHER, fullName: 'Karimov Rustam' }],
};
const handler = (c: Call) => {
  if (c.method === 'GET') return c.path in lists ? json(200, lists[c.path]) : json(200, []);
  if (c.method === 'POST' && c.path === '/groups') return json(409, conflict);
  return json(200, detail);
};
const MANAGE = ['group.view', 'group.manage', 'course.manage'] as const;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-10 Guruhlar (T-103)', () => {
  it("group.view yo'q — ruxsat yo'q holati, API chaqirilmaydi", async () => {
    const calls = fakeApi(['course.manage'], handler);
    renderApp('/groups');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("ro'yxat: jadval matni, to'lganlik; group.manage yo'q — yaratish va tahrir yo'q", async () => {
    const calls = fakeApi(['group.view'], handler);
    renderApp('/groups');
    const row = (await screen.findByText(group.name)).closest('tr') as HTMLElement;
    expect(within(row).getByText('Du/Ch/Ju 15:00')).toBeTruthy();
    expect(await within(row).findByText('20 / 20')).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.groups.new })).toBeNull();
    await userEvent.setup().click(row);
    expect(await screen.findByText(t.groups.detail.noStudents)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.groups.detail.changeSchedule })).toBeNull();
    expect(calls.map((c) => c.path)).not.toContain('/teachers');
  });

  it("FR-ORG-6: yaratishda to'qnashuv — qaysi xona, qachon, qaysi guruh", async () => {
    const calls = fakeApi(MANAGE, handler);
    renderApp('/groups');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: t.groups.new }));
    await user.click(screen.getByRole('button', { name: t.groups.form.create }));
    expect(screen.getByText(t.groups.form.errors.courseId)).toBeTruthy();
    await user.type(screen.getByLabelText(t.groups.form.name), 'IELTS — B3');
    await user.selectOptions(await screen.findByLabelText(t.groups.form.course), COURSE);
    await user.selectOptions(screen.getByLabelText(t.groups.form.room), ROOM);
    await user.click(screen.getByRole('button', { name: t.calendar.days[0] }));
    await user.click(screen.getByRole('button', { name: t.groups.form.create }));
    const expected = t.groups.conflict
      .replace('{room}', '204-xona')
      .replace('{time}', 'Du 15:00–16:30')
      .replace('{group}', group.name);
    expect(await screen.findByText(expected)).toBeTruthy();
    expect(calls.find((c) => c.method === 'POST')?.body).toMatchObject({
      name: 'IELTS — B3',
      courseId: COURSE,
      roomId: ROOM,
      slots: [{ weekday: 1, startTime: '15:00', endTime: '16:30' }],
      teachers: [],
    });
  });

  it("FR-ORG-3: holat — faqat ruxsat etilgan o'tishlar; yakunlash tasdiq bilan", async () => {
    const calls = fakeApi(MANAGE, handler);
    vi.stubGlobal('confirm', () => true);
    renderApp('/groups');
    const user = userEvent.setup();
    await user.click(await screen.findByText(group.name));
    const actions = t.groups.detail.statusActions;
    expect(await screen.findByRole('button', { name: actions.paused })).toBeTruthy();
    expect(screen.queryByRole('button', { name: actions.active })).toBeNull();
    await user.click(screen.getByRole('button', { name: actions.finished }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'POST',
        path: '/groups/g1/status',
        body: { status: 'finished' },
      }),
    );
  });

  it('FR-ORG-4: jadvalni sanadan almashtirish — PUT /schedule', async () => {
    const calls = fakeApi(MANAGE, handler);
    renderApp('/groups');
    const user = userEvent.setup();
    await user.click(await screen.findByText(group.name));
    await user.click(await screen.findByRole('button', { name: t.groups.detail.changeSchedule }));
    await user.click(screen.getByRole('button', { name: t.calendar.days[5] }));
    await user.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.path).toBe('/groups/g1/schedule');
    expect((put?.body as { slots: { weekday: number }[] }).slots.map((s) => s.weekday)).toEqual([
      1, 3, 5, 6,
    ]);
  });
});

describe('guruh qoralamasi (API bilan bitta Zod sxema)', () => {
  it("bloklar ⇄ slotlar; turli vaqtlar alohida blok; ro'yxat matni", () => {
    const slots = [slot(6, '10:00', '11:30'), slot(3), slot(1)];
    const blocks = blocksOf(slots);
    expect(blocks).toEqual([
      { days: [1, 3], start: '15:00', end: '16:30' },
      { days: [6], start: '10:00', end: '11:30' },
    ]);
    expect(slotsOf(blocks)).toHaveLength(3);
    expect(scheduleText(slots)).toBe('Du/Ch 15:00, Sh 10:00');
  });
  it('yordamchi = asosiy ustoz — xato; qisqa dars — xato; narx bo‘sh — yuborilmaydi', () => {
    const base = { ...emptyDraft('2026-11-13'), name: 'Guruh', courseId: COURSE };
    const same = createBody({ ...base, teacherId: TEACHER, assistantId: TEACHER });
    expect(same.ok ? {} : same.errors).toHaveProperty('teachers');
    const short = createBody({ ...base, blocks: [{ days: [1], start: '15:00', end: '15:10' }] });
    expect(short.ok ? {} : short.errors).toHaveProperty('slots');
    const ok = createBody({ ...base, price: 700_000n });
    expect(ok.ok && ok.body.monthlyPrice).toBe('700000');
    const inherit = createBody(base);
    expect(inherit.ok && 'monthlyPrice' in inherit.body).toBe(false);
  });
});
