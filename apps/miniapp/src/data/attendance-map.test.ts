import type { LessonAttendance } from '@lg/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { enqueue, flush, queued } from './attendance-queue.js';
import { roster, savedMarks, toItems } from './attendance-map.js';

const att = {
  records: [
    { studentId: 's1', status: 'late', lateMinutes: 10 },
    { studentId: 's2', status: 'excused', lateMinutes: null },
  ],
  expectedStudents: [
    { id: 's1', fullName: 'Ali', code: '1' },
    { id: 's2', fullName: 'Vali', code: '2', advanceAbsenceReason: 'Kasal' },
  ],
} as unknown as LessonAttendance;

describe('davomat (T-111, FR-ATT-2/6/7)', () => {
  beforeEach(() => localStorage.clear());

  it('ro‘yxat: oldindan sababli belgilanadi; saqlangan belgilar va qaytish', () => {
    expect(roster(att).map((s) => s.preExcused)).toEqual([false, true]);
    const marks = savedMarks(att);
    expect(marks).toEqual({ s1: { kind: 'late', minutes: 10 }, s2: { kind: 'excused' } });
    expect(toItems(marks ?? {})).toEqual([
      { studentId: 's1', status: 'late', lateMinutes: 10 },
      { studentId: 's2', status: 'excused' },
    ]);
    expect(savedMarks({ ...att, records: [] })).toBeUndefined();
  });

  it('offline navbat: dars bo‘yicha oxirgisi qoladi; tarmoq xatosi — qoladi, yuborilgani — ketadi', async () => {
    const item = (lessonId: string, id: string) => ({
      lessonId,
      body: { clientMutationId: id, items: [] },
    });
    enqueue(item('L1', 'a'));
    enqueue(item('L1', 'b'));
    enqueue(item('L2', 'c'));
    expect(queued().map((q) => q.body.clientMutationId)).toEqual(['b', 'c']);
    await flush(async (q) => (q.lessonId === 'L1' ? 'sent' : 'retry'));
    expect(queued().map((q) => q.lessonId)).toEqual(['L2']);
  });
});
