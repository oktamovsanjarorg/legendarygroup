import type { GroupListItem, LessonAttendance, LessonDto } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import { lessonState, teacherGroups, todayLessons } from './teacher-map.js';
import { weekDates } from './time.js';

const lesson = (id: string, start: string, end: string, status = 'scheduled'): LessonDto =>
  ({
    id,
    group: { id: 'g1', name: 'IELTS B2' },
    date: '2026-11-12',
    startTime: start,
    endTime: end,
    room: { id: 'r1', name: '204-xona' },
    teacher: { id: 'u1', name: 'Ustoz' },
    isSubstitute: false,
    status,
  }) as LessonDto;

const group = {
  id: 'g1',
  name: 'IELTS B2',
  course: { id: 'c1', name: 'Ingliz tili' },
  mainTeacher: { id: 'u1', fullName: 'Ustoz' },
} as GroupListItem;

const att = (records: string[], expected: number): LessonAttendance =>
  ({
    records: records.map((status, i) => ({ studentId: `s${i}`, status, lateMinutes: null })),
    expectedStudents: Array.from({ length: expected }, (_, i) => ({
      id: `s${i}`,
      fullName: 'X',
      code: '1',
    })),
  }) as unknown as LessonAttendance;

describe('ustoz mapper’lari (T-114)', () => {
  const now = new Date('2026-11-12T12:00:00+05:00');

  it('holat: o‘tgan belgilanmagan / hozir / kutilmoqda / belgilangan (kech — keldi)', () => {
    const list = todayLessons(
      [
        lesson('a', '09:00', '10:30'),
        lesson('b', '11:30', '13:00'),
        lesson('c', '15:00', '16:30'),
        lesson('d', '08:00', '09:00'),
      ],
      [group],
      new Map([['d', att(['present', 'late', 'absent'], 3)]]),
      now,
    );
    expect(list.map((l) => [l.id, l.state])).toEqual([
      ['d', { kind: 'marked', present: 2, total: 3 }],
      ['a', { kind: 'unmarked' }],
      ['b', { kind: 'now' }],
      ['c', { kind: 'upcoming' }],
    ]);
    expect(list[0]?.courseName).toBe('Ingliz tili');
    expect(list[0]?.startsAt.toISOString()).toBe('2026-11-12T03:00:00.000Z');
  });

  it('bekor qilingan dars ko‘rinmaydi; davomatsiz — vaqt bo‘yicha', () => {
    expect(
      todayLessons([lesson('x', '09:00', '10:00', 'cancelled')], [group], new Map(), now),
    ).toEqual([]);
    const info = { id: 'a', groupName: '', courseName: '', room: '', startsAt: now, endsAt: now };
    expect(lessonState(info, now, att([], 5))).toEqual({ kind: 'unmarked' });
  });

  it('guruh roli: asosiy ustoz yoki yordamchi; son yo‘q — 0', () => {
    expect(teacherGroups([group], {}, 'u1')[0]).toMatchObject({ role: 'main', studentCount: 0 });
    expect(teacherGroups([group], { g1: 7 }, 'u2')[0]).toMatchObject({
      role: 'assistant',
      studentCount: 7,
    });
  });

  it('hafta dushanbadan (yakshanba — oldingi hafta)', () => {
    expect(weekDates('2026-11-15')).toEqual([
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
      '2026-11-14',
      '2026-11-15',
    ]);
    expect(weekDates('2026-11-16')[0]).toBe('2026-11-16');
  });
});
