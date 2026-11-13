import type { Course, Room } from '@lg/contracts';
import { formatMoney, webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { courseBody } from './course-drawer.js';

const stamp = {
  archivedAt: null,
  createdAt: '2026-11-01T05:00:00Z',
  updatedAt: '2026-11-01T05:00:00Z',
};
const ielts: Course = {
  id: 'c1',
  name: 'Ingliz tili (IELTS)',
  description: null,
  levels: ['B1', 'B2'],
  defaultMonthlyPrice: '650000',
  lessonDurationMin: 90,
  durationMonths: 9,
  gradeScale: '0_5',
  ...stamp,
};
const room: Room = { id: 'r1', name: '101-xona', capacity: 16, ...stamp };
const group = {
  id: 'g1',
  course: { id: 'c1', name: ielts.name },
  room: { id: 'r1', name: room.name },
};

const handler = (c: Call) => {
  if (c.method !== 'GET') return json(200, {});
  if (c.path === '/courses?status=active') return json(200, [ielts]);
  if (c.path === '/rooms?status=active') return json(200, [room]);
  if (c.path.startsWith('/courses') || c.path.startsWith('/rooms')) return json(200, []);
  if (c.path === '/groups?status=current') return json(200, [group, { ...group, id: 'g2' }]);
  return undefined;
};
const FULL = ['course.manage', 'group.view'] as const;
const f = t.courses.form;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-09 Kurslar va xonalar (T-102)', () => {
  it("course.manage yo'q — ruxsat yo'q holati, API chaqirilmaydi", async () => {
    const calls = fakeApi(['group.view'], handler);
    renderApp('/courses');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("ro'yxat: narx formatMoney bilan, joriy guruhlar soni", async () => {
    fakeApi(FULL, handler);
    renderApp('/courses');
    const row = (await screen.findByText(ielts.name)).closest('tr') as HTMLElement;
    expect(row.textContent).toContain(formatMoney(650_000n));
    expect(await within(row).findByText('2')).toBeTruthy();
  });

  it("FR-ORG-1: yangi kurs — xato maydon yonida, to'g'ri bo'lsa POST (pul string)", async () => {
    const calls = fakeApi(FULL, handler);
    renderApp('/courses');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: t.common.add }));
    await user.click(screen.getByRole('button', { name: t.common.save }));
    expect(screen.getByText(f.errors.name)).toBeTruthy();
    expect(screen.getByText(f.errors.defaultMonthlyPrice)).toBeTruthy();
    await user.type(screen.getByLabelText(f.name), 'Matematika');
    await user.type(screen.getByLabelText(f.levels), '5-sinf, 6-sinf');
    await user.type(screen.getByLabelText(f.price), '550000');
    await user.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() => expect(calls.find((c) => c.method === 'POST')).toBeTruthy());
    expect(calls.find((c) => c.method === 'POST')).toEqual({
      method: 'POST',
      path: '/courses',
      body: {
        name: 'Matematika',
        description: null,
        levels: ['5-sinf', '6-sinf'],
        defaultMonthlyPrice: '550000',
        lessonDurationMin: 90,
        durationMonths: null,
        gradeScale: '0_5',
      },
    });
  });

  it('FR-ORG-2: xonani tahrirlash — PATCH; arxivlash — tasdiqdan keyin POST archive', async () => {
    const calls = fakeApi(FULL, handler);
    vi.stubGlobal('confirm', () => true);
    renderApp('/courses');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('tab', { name: new RegExp(t.courses.rooms) }));
    await user.click(await screen.findByText(room.name));
    const capacity = screen.getByLabelText(f.capacity);
    await user.clear(capacity);
    await user.type(capacity, '0');
    await user.click(screen.getByRole('button', { name: t.common.save }));
    expect(screen.getByText(f.errors.capacity)).toBeTruthy();
    await user.clear(capacity);
    await user.type(capacity, '18');
    await user.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/rooms/r1',
        body: { name: room.name, capacity: 18 },
      }),
    );
    await user.click(await screen.findByText(room.name));
    await user.click(screen.getByRole('button', { name: t.common.archive }));
    await waitFor(() =>
      expect(calls.map((c) => `${c.method} ${c.path}`)).toContain('POST /rooms/r1/archive'),
    );
  });

  it("arxivdagilar: status=archived so'raladi", async () => {
    const calls = fakeApi(FULL, handler);
    renderApp('/courses');
    await userEvent.setup().click(await screen.findByLabelText(t.common.showArchived));
    expect(await screen.findByText(t.courses.empty.archived)).toBeTruthy();
    expect(calls.map((c) => c.path)).toContain('/courses?status=archived');
  });
});

describe('courseBody (API bilan bitta Zod sxema)', () => {
  const draft = {
    name: 'Kurs',
    description: '',
    levels: 'A1, a1',
    price: 100n,
    lessonDurationMin: '10',
    durationMonths: 'x',
    gradeScale: '0_5' as const,
  };
  it('takroriy daraja, qisqa dars, raqam emas oy — rad etiladi', () => {
    const r = courseBody(draft);
    expect(r.success).toBe(false);
    const fields = r.success ? [] : r.error.issues.map((i) => i.path[0]);
    expect(new Set(fields)).toEqual(new Set(['levels', 'lessonDurationMin', 'durationMonths']));
  });
});
