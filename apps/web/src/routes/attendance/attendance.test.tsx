import type { GroupAttendance } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { todayYmd } from '../../lib/today.js';
import { addDays } from '../../lib/ymd.js';
import { type Call, fakeApi, json, renderApp } from '../../test/app.js';
import { toGrid } from './grid-map.js';

const G = '0190a000-0000-7000-8000-0000000000d1';
const S = '0190a000-0000-7000-8000-0000000000e1';
const L1 = '0190a000-0000-7000-8000-0000000000f1';
const L2 = '0190a000-0000-7000-8000-0000000000f2';
const today = todayYmd();
const yesterday = addDays(today, -1);
const grid: GroupAttendance = {
  groupId: G,
  lessons: [
    { id: L1, date: yesterday, startTime: '14:00', cancelled: false },
    { id: L2, date: today, startTime: '14:00', cancelled: false },
  ],
  students: [{ id: S, name: 'Aliyev Jasur' }],
  marks: [{ lessonId: L2, studentId: S, status: 'present' }],
};
const g = t.attendanceGrid;
const handler = (locked: boolean) => (c: Call) => {
  if (c.path === '/groups?status=current') return json(200, [{ id: G, name: 'IELTS' }]);
  if (c.path.startsWith('/attendance/groups?')) return json(200, grid);
  if (c.method === 'POST' && c.path.startsWith('/attendance/lessons/'))
    return locked
      ? json(409, { code: 'ATTENDANCE_LOCKED_PAST', message: 'Yopilgan' })
      : json(201, {});
  if (c.method === 'POST') return json(201, { id: 'a' });
  return undefined;
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-12 Davomat (T-112, FR-ATT-4/5, BR-30)', () => {
  it('FR-ATT-5: belgilanmagan oʻtgan dars ustuni ajratiladi; bekor qilingan dars — ustun emas', () => {
    const v = toGrid(
      {
        ...grid,
        lessons: [...grid.lessons, { id: 'x', date: today, startTime: '18:00', cancelled: true }],
      },
      [],
      today,
    );
    expect(v.dates).toHaveLength(2);
    expect(v.unmarked).toEqual([0]);
    expect(v.rows[0]?.marks).toEqual([null, 'present']);
  });

  it('attendance.mark yoʻq — ruxsat yoʻq', async () => {
    const calls = fakeApi(['group.view'], handler(false));
    renderApp('/attendance');
    expect(await screen.findByText(t.states.forbiddenTitle)).toBeTruthy();
    expect(calls).toEqual([]);
  });

  it('BR-30: kechagi katak — sabab majburiy; yopilgan oy — Direktorga soʻrov', async () => {
    const calls = fakeApi(['attendance.mark', 'group.view'], handler(true));
    renderApp('/attendance');
    const user = userEvent.setup();
    await user.click(
      await screen.findByRole('button', {
        name: new RegExp(`Aliyev Jasur, ${yesterday.slice(8, 10)}`),
      }),
    );
    await user.click(screen.getByRole('radio', { name: g.marks.absent }));
    expect(screen.getByRole('button', { name: g.save }).hasAttribute('disabled')).toBe(true);
    await user.type(screen.getByLabelText(g.reason), 'Jurnalda xato');
    await user.click(screen.getByRole('button', { name: g.save }));
    expect(await screen.findByText(g.lockedPast)).toBeTruthy();
    await user.click(screen.getByRole('button', { name: g.sendRequest }));
    await screen.findByText(g.requestSent);
    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'POST').map((c) => c.body)).toEqual([
        { items: [{ studentId: S, status: 'absent' }], changeReason: 'Jurnalda xato' },
        {
          type: 'attendance_edit',
          payload: { lessonId: L1, studentId: S, status: 'absent', reason: 'Jurnalda xato' },
          reason: 'Jurnalda xato',
        },
      ]),
    );
  });
});
