import type { Permission } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import type { RequestUser } from '../auth/index.js';
import type { AssistantDeps } from './assistant.deps.js';
import { AssistantToolbox, prefillFor } from './assistant.toolbox.js';

const user: RequestUser = { id: 'u1', role: 'admin', sessionId: null, pv: 1 };
const SID = '11111111-1111-4111-8111-111111111111';
const perms = (...p: Permission[]) => new Set<Permission>(p);

const deps = {
  groups: {
    list: async () => [
      {
        id: 'g1',
        name: 'Robototexnika 1',
        status: 'active',
        course: { id: 'c', name: 'Robototexnika' },
        room: { id: 'r', name: '2-xona' },
        monthlyPrice: '600000',
        mainTeacher: { id: 't', fullName: 'Karimov Jasur' },
        slots: [],
      },
      {
        id: 'g2',
        name: 'Ingliz A1',
        status: 'active',
        course: { id: 'c2', name: 'Ingliz' },
        room: null,
        monthlyPrice: '500000',
        mainTeacher: null,
        slots: [],
      },
    ],
  },
  lessons: {
    calendar: async (_u: RequestUser, q: { from: string }) => [
      {
        group: { name: 'B' },
        date: q.from,
        startTime: '14:00',
        endTime: '15:30',
        teacher: null,
        room: null,
        status: 'planned',
        topic: null,
      },
      {
        group: { name: 'A' },
        date: q.from,
        startTime: '09:00',
        endTime: '10:30',
        teacher: { name: 'Jasur' },
        room: null,
        status: 'held',
        topic: 'Sensorlar',
      },
    ],
  },
  clock: { today: () => '2026-11-26' },
} as unknown as AssistantDeps;

describe('Yordamchi vositalari (T-175, Q-122)', () => {
  it('prefill: faqat shu formaning maydonlari; boshqa ekranda — yoʻq', () => {
    expect(prefillFor('pay', { amount: '500000', fullName: 'X Y Z' })).toEqual({
      amount: '500000',
    });
    expect(prefillFor('addExpense', { amount: '90000', category: 'rent', note: 'Noyabr' })).toEqual(
      {
        amount: '90000',
        category: 'rent',
        note: 'Noyabr',
      },
    );
    expect(
      prefillFor('newAnnouncement', {
        title: 'Dars yoʻq',
        body: 'Ertaga dars boʻlmaydi.',
        amount: '5',
      }),
    ).toEqual({
      title: 'Dars yoʻq',
      body: 'Ertaga dars boʻlmaydi.',
    });
    expect(prefillFor('debtors', { amount: '1' })).toBeUndefined();
    expect(prefillFor('pay', {})).toBeUndefined();
  });

  it('open_screen prefill bilan; notoʻgʻri summa (kasr, manfiy) — rad', async () => {
    const box = new AssistantToolbox(deps, user, perms('payment.create'));
    const ok = await box.run('open_screen', {
      screen: 'pay',
      student_id: SID,
      prefill: { amount: '500000' },
    });
    expect(ok.content).toContain('"prefilled":true');
    expect(box.actions).toEqual([{ screen: 'pay', studentId: SID, prefill: { amount: '500000' } }]);
    const bad = await box.run('open_screen', {
      screen: 'pay',
      student_id: SID,
      prefill: { amount: '12.5' },
    });
    expect(bad.isError).toBe(true);
  });

  it('ruxsatsiz ekranga prefill ham oʻtmaydi', async () => {
    const box = new AssistantToolbox(deps, user, perms('student.view'));
    const r = await box.run('open_screen', { screen: 'addExpense', prefill: { amount: '1000' } });
    expect(r.isError).toBe(true);
    expect(box.actions).toHaveLength(0);
  });

  it('list_groups: nom boʻyicha filtr; ruxsatsiz — xato', async () => {
    const box = new AssistantToolbox(deps, user, perms('group.view'));
    const r = JSON.parse((await box.run('list_groups', { query: 'robot' })).content) as {
      name: string;
      teacher: string;
    }[];
    expect(r).toEqual([
      expect.objectContaining({ name: 'Robototexnika 1', teacher: 'Karimov Jasur' }),
    ]);
    const no = new AssistantToolbox(deps, user, perms());
    expect((await no.run('list_groups', {})).isError).toBe(true);
  });

  it('day_lessons: sana berilmasa — bugun; vaqt boʻyicha tartib; bugungi sana javobda', async () => {
    const box = new AssistantToolbox(deps, user, perms('group.view'));
    const r = JSON.parse((await box.run('day_lessons', {})).content) as {
      today: string;
      date: string;
      lessons: { group: string }[];
    };
    expect(r.today).toBe('2026-11-26');
    expect(r.date).toBe('2026-11-26');
    expect(r.lessons.map((l) => l.group)).toEqual(['A', 'B']);
    expect((await box.run('day_lessons', { date: '26.11.2026' })).isError).toBe(true);
  });
});
