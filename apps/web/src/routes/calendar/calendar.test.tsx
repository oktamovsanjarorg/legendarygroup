import type { LessonDto } from '@lg/contracts';
import { toYmd, webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { addDays, weekStart } from '../../lib/ymd.js';
import { type Call, fakeApi, json, noContent, renderApp } from '../../test/app.js';
import { weekTitle } from './index.js';

const today = toYmd(new Date());
const monday = weekStart(today);
const lesson = (over: Partial<LessonDto>): LessonDto => ({
  id: 'l1',
  group: { id: 'g1', name: 'IELTS 7.0 — B2-guruh' },
  date: today,
  startTime: '15:00',
  endTime: '16:30',
  room: { id: 'r1', name: '204-xona' },
  teacher: { id: 't1', name: 'Karimov Rustam' },
  isSubstitute: false,
  roomOverridden: false,
  status: 'scheduled',
  kind: 'regular',
  cancelReason: null,
  cancelSource: null,
  compensation: null,
  makeupLessonId: null,
  makeupForLessonId: null,
  topic: null,
  ...over,
});
const cancelled = lesson({
  id: 'l2',
  group: { id: 'g2', name: 'Matematika — A1' },
  status: 'cancelled',
  cancelReason: 'Ustoz kasal',
});

const handler = (c: Call) => {
  if (c.method !== 'GET') return c.method === 'DELETE' ? noContent() : json(200, {});
  if (c.path.startsWith('/lessons?')) return json(200, [lesson({}), cancelled]);
  if (c.path.startsWith('/holidays')) return json(200, [{ date: today, name: 'Namuna bayram' }]);
  if (c.path === '/teachers') return json(200, [{ id: 't2', fullName: 'Saidova Lola' }]);
  return json(200, []);
};
const MANAGE = ['group.view', 'lesson.manage'] as const;
const m = t.calendar.lesson;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-11 Jadval (T-104)', () => {
  it("group.view yo'q — ruxsat yo'q holati, API chaqirilmaydi", async () => {
    const calls = fakeApi(['course.manage'], handler);
    renderApp('/calendar');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it("joriy hafta so'raladi (Du–Ya); bayram va bekor qilingan dars ko'rinadi", async () => {
    const calls = fakeApi(['group.view'], handler);
    renderApp('/calendar');
    expect(await screen.findByText('IELTS 7.0 — B2-guruh')).toBeTruthy();
    expect(screen.getByText(`${t.calendar.holiday}: Namuna bayram`)).toBeTruthy();
    expect(screen.getByText(t.calendar.cancelled)).toBeTruthy();
    expect(calls.map((c) => c.path)).toContain(`/lessons?from=${monday}&to=${addDays(monday, 6)}`);
    expect(screen.queryByRole('button', { name: t.calendar.addExtra })).toBeNull();
  });

  it("lesson.manage yo'q — dars paneli faqat ma'lumot", async () => {
    fakeApi(['group.view'], handler);
    renderApp('/calendar');
    await userEvent.setup().click(await screen.findByText('IELTS 7.0 — B2-guruh'));
    expect(await screen.findByText('Karimov Rustam')).toBeTruthy();
    expect(screen.queryByRole('button', { name: m.cancelSubmit })).toBeNull();
  });

  it('BR-5: bekor qilish — sabab majburiy; kredit tanlansa compensation=credit', async () => {
    const calls = fakeApi(MANAGE, handler);
    renderApp('/calendar');
    const user = userEvent.setup();
    await user.click(await screen.findByText('IELTS 7.0 — B2-guruh'));
    await user.click(await screen.findByRole('button', { name: m.cancelSubmit }));
    const submit = screen.getAllByRole('button', { name: m.cancelSubmit }).at(-1) as HTMLElement;
    await user.click(submit);
    expect(screen.getByText(m.errors.reason)).toBeTruthy();
    await user.type(screen.getByLabelText(m.cancelReason), 'Ustoz kasal');
    await user.click(screen.getByLabelText(m.credit));
    await user.click(submit);
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'POST',
        path: '/lessons/l1/cancel',
        body: { reason: 'Ustoz kasal', compensation: 'credit' },
      }),
    );
  });

  it("FR-ORG-6: o'rinbosar — PATCH teacherId; xona tanlovi course.manage'siz yashirin", async () => {
    const calls = fakeApi(MANAGE, handler);
    renderApp('/calendar');
    const user = userEvent.setup();
    await user.click(await screen.findByText('IELTS 7.0 — B2-guruh'));
    await user.click(await screen.findByRole('button', { name: t.common.edit }));
    expect(screen.queryByLabelText(m.substituteRoom)).toBeNull();
    await user.selectOptions(screen.getByLabelText(m.substituteTeacher), 't2');
    await user.click(screen.getByRole('button', { name: t.common.save }));
    await waitFor(() =>
      expect(calls).toContainEqual({
        method: 'PATCH',
        path: '/lessons/l1',
        body: { teacherId: 't2' },
      }),
    );
  });

  it('bekor qilingan dars: tiklash — POST restore', async () => {
    const calls = fakeApi(MANAGE, handler);
    renderApp('/calendar');
    const user = userEvent.setup();
    await user.click(await screen.findByText('Matematika — A1'));
    expect(await screen.findByText('Ustoz kasal')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: m.restore }));
    await waitFor(() =>
      expect(calls.map((c) => `${c.method} ${c.path}`)).toContain('POST /lessons/l2/restore'),
    );
  });

  it("oy ko'rinishi: to'liq haftalar oralig'i so'raladi (≤ 42 kun)", async () => {
    const calls = fakeApi(['group.view'], handler);
    renderApp('/calendar');
    await userEvent.setup().click(await screen.findByRole('tab', { name: t.calendar.month }));
    await waitFor(() =>
      expect(calls.filter((c) => c.path.startsWith('/lessons?'))).toHaveLength(2),
    );
    const q = new URLSearchParams(calls.at(-1)?.path.split('?')[1]);
    const days = (Date.parse(q.get('to') ?? '') - Date.parse(q.get('from') ?? '')) / 86_400_000 + 1;
    expect(days % 7).toBe(0);
    expect(days).toBeLessThanOrEqual(42);
  });
});

describe('hafta sarlavhasi', () => {
  it('bir oy ichida va oy chegarasida', () => {
    expect(weekTitle('2026-11-09', '2026-11-15')).toBe('9–15-noyabr, 2026');
    expect(weekTitle('2026-11-30', '2026-12-06')).toBe('30-noyabr – 6-dekabr, 2026');
  });
});
