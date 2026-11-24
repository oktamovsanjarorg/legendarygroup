import type { EnrollmentDto } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import { studentManage } from './staff-student.js';

const enr = (id: string, endDate: string | null): EnrollmentDto => ({
  id,
  studentId: 's1',
  group: { id: `g-${id}`, name: `Guruh ${id}` },
  startDate: '2026-09-01',
  endDate,
  endReason: endDate ? 'left' : null,
  discountPercent: null,
  state: endDate && endDate < '2026-11-22' ? 'ended' : 'active',
  freezes: [],
});

describe('studentManage (T-144, Q-93)', () => {
  const today = '2026-11-22';
  it('ochiq aʼzolik — chiqarish mumkin, arxivlash yoʻq', () => {
    const m = studentManage([enr('a', null)], null, today);
    expect(m.groups.map((g) => g.enrollmentId)).toEqual(['a']);
    expect(m.canArchive).toBe(false);
  });
  it('kelajak sanada chiqadi — roʻyxatda sanasi bilan, arxivlash hali yoʻq', () => {
    const m = studentManage([enr('a', '2026-11-30')], null, today);
    expect(m.groups[0]?.text).toContain('30.11.2026');
    expect(m.canArchive).toBe(false);
  });
  it('bugun yoki oldin chiqqan — arxivlash mumkin', () => {
    expect(studentManage([enr('a', today), enr('b', '2026-10-01')], null, today).canArchive).toBe(
      true,
    );
    expect(studentManage([], '2026-11-01T10:00:00Z', today).archived).toBe(true);
  });
});
