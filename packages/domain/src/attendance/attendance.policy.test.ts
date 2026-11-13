import { describe, expect, it } from 'vitest';
import { canEditAttendance, shouldNotifyAbsenceOrLate } from './attendance.policy.js';

describe('BR-30 canEditAttendance', () => {
  const now = new Date('2026-11-13T15:00:00Z'); // Bugun: 2026-11-13

  it('ustoz bugungi dars davomatini oʻzgartira oladi (sababsiz)', () => {
    const res = canEditAttendance({
      lessonDate: '2026-11-13',
      userRole: 'teacher',
      hasEditPastPermission: false,
      now,
    });
    expect(res.allowed).toBe(true);
    expect(res.requiresReason).toBe(false);
  });

  it('ustoz oʻtgan kungi dars davomatini oʻzgartira olmaydi (ATTENDANCE_LOCKED_PAST)', () => {
    const res = canEditAttendance({
      lessonDate: '2026-11-12',
      userRole: 'teacher',
      hasEditPastPermission: false,
      now,
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe('ATTENDANCE_LOCKED_PAST');
  });

  it('admin oʻtgan kungi dars davomatini oʻzgartira oladi (sabab talab qilinadi)', () => {
    const res = canEditAttendance({
      lessonDate: '2026-11-10',
      userRole: 'admin',
      hasEditPastPermission: true,
      now,
    });
    expect(res.allowed).toBe(true);
    expect(res.requiresReason).toBe(true);
  });
});

describe('BR-31, BR-10 shouldNotifyAbsenceOrLate', () => {
  it('kelmadi (absent) uchun xabar yuboriladi', () => {
    expect(shouldNotifyAbsenceOrLate({ status: 'absent' })).toBe(true);
  });

  it('keldi (present) yoki sababli (excused) uchun xabar yuborilmaydi', () => {
    expect(shouldNotifyAbsenceOrLate({ status: 'present' })).toBe(false);
    expect(shouldNotifyAbsenceOrLate({ status: 'excused' })).toBe(false);
  });

  it('15 daqiqadan kam kechikish uchun xabar yuborilmaydi (BR-10)', () => {
    expect(shouldNotifyAbsenceOrLate({ status: 'late', lateMinutes: 10 })).toBe(false);
    expect(shouldNotifyAbsenceOrLate({ status: 'late', lateMinutes: 14 })).toBe(false);
  });

  it('15 daqiqa va undan koʻp kechikish uchun xabar yuboriladi (BR-10)', () => {
    expect(shouldNotifyAbsenceOrLate({ status: 'late', lateMinutes: 15 })).toBe(true);
    expect(shouldNotifyAbsenceOrLate({ status: 'late', lateMinutes: 25 })).toBe(true);
  });
});
