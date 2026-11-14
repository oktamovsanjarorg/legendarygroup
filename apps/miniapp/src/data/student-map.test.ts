import { describe, expect, it } from 'vitest';
import { editDeadline, monthCalendar, studentProfile } from './student-map.js';

describe('o‘quvchi profili (T-114, BR-37)', () => {
  it('kalendar: noyabr 2026 — 1-kun yakshanba (siljish 6), 30 kun; faqat shu oy', () => {
    const m = monthCalendar('2026-11-12', [
      { lessonId: 'a', date: '2026-11-11', groupName: 'G', status: 'absent' },
      { lessonId: 'b', date: '2026-10-30', groupName: 'G', status: 'present' },
    ]);
    expect(m).toMatchObject({ offset: 6, daysInMonth: 30, marks: { 11: 'absent' } });
    expect(monthCalendar('2027-02-10', []).daysInMonth).toBe(28);
    expect(monthCalendar('2026-06-01', []).offset).toBe(0);
  });

  it('BR-37: dars kuni + 3 kun, 23:59 (Toshkent)', () => {
    expect(editDeadline('2026-11-12').toISOString()).toBe('2026-11-15T18:59:00.000Z');
  });

  it('boshqa guruh izohi va davomati ko‘rinmaydi; ko‘rinish — ota-onaga/ichki', () => {
    const p = studentProfile({
      name: 'Ali',
      groupName: 'G',
      today: '2026-11-12',
      attendance: [
        { lessonId: 'x', date: '2026-11-12', groupName: 'H', status: 'late' },
        { lessonId: 'a', date: '2026-11-10', groupName: 'G', status: 'present' },
      ],
      history: {
        grades: [{ id: 'g', lessonId: 'a', date: '2026-11-10', kind: 'homework', value: 5 }],
        comments: [
          {
            id: 'c1',
            text: 'Yaxshi',
            visibility: 'guardian',
            groupName: 'G',
            createdAt: '2026-11-10T10:00:00Z',
          },
          {
            id: 'c2',
            text: 'Boshqa',
            visibility: 'internal',
            groupName: 'H',
            createdAt: '2026-11-11T10:00:00Z',
          },
        ],
      },
    });
    expect(p.month.marks).toEqual({ 10: 'present' });
    expect(p.comments.map((c) => [c.id, c.visibility])).toEqual([['c1', 'parent']]);
    expect(p.grades[0]?.value).toBe('5');
    expect(p.editableUntil.toISOString()).toBe('2026-11-13T18:59:00.000Z');
  });
});
