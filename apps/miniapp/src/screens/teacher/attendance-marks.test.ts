import { describe, expect, it } from 'vitest';
import { cameCount, initialMarks, isDirty, toggled } from './attendance-marks.js';

const students = [
  { id: 'a', name: 'Ali' },
  { id: 'b', name: 'Bobur', preExcused: true },
  { id: 'c', name: 'Charos' },
];

describe('davomat belgilari (FR-ATT-1/2/7)', () => {
  it('standart — keldi; oldindan sababli — sababli', () => {
    expect(initialMarks(students)).toEqual({
      a: { kind: 'present' },
      b: { kind: 'excused' },
      c: { kind: 'present' },
    });
  });

  it('saqlangan davomat ustun', () => {
    expect(initialMarks(students, { a: { kind: 'absent' } }).a).toEqual({ kind: 'absent' });
  });

  it('teginish: keldi ↔ kelmadi; kech/sababli → keldi', () => {
    expect(toggled({ kind: 'present' })).toEqual({ kind: 'absent' });
    expect(toggled({ kind: 'absent' })).toEqual({ kind: 'present' });
    expect(toggled({ kind: 'late', minutes: 10 })).toEqual({ kind: 'present' });
    expect(toggled({ kind: 'excused' })).toEqual({ kind: 'present' });
  });

  it('kech qolgan ham "keldi" sanaladi', () => {
    expect(
      cameCount({
        a: { kind: 'late', minutes: 5 },
        b: { kind: 'excused' },
        c: { kind: 'present' },
      }),
    ).toBe(2);
  });

  it("o'zgarish: daqiqa farqi ham hisobga olinadi", () => {
    const base = initialMarks(students);
    expect(isDirty(base, base)).toBe(false);
    expect(isDirty(base, { ...base, a: { kind: 'absent' } })).toBe(true);
    const late = { ...base, a: { kind: 'late' as const, minutes: 5 } };
    expect(isDirty(late, { ...late, a: { kind: 'late', minutes: 10 } })).toBe(true);
  });
});
