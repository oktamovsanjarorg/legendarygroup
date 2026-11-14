import { describe, expect, it } from 'vitest';
import {
  addDays,
  canEditPayroll,
  canGrantDiscount,
  canMarkAttendance,
  canReversePayment,
  canReviewSubmission,
  canWriteGrade,
} from './index.js';

// Toshkent = UTC+5. 2026-11-10 19:30Z = 11-noyabr 00:30 Toshkent.
const at = (iso: string) => new Date(iso);

describe('BR-30: canMarkAttendance', () => {
  const lesson = { lessonDate: '2026-11-11', lessonStatus: 'scheduled' as const };

  it('BR-30: ustoz — dars kuni (Toshkent vaqti bilan) ruxsat', () => {
    expect(
      canMarkAttendance({ role: 'teacher', ...lesson }, at('2026-11-10T19:30:00Z')).allowed,
    ).toBe(true);
    expect(
      canMarkAttendance({ role: 'teacher', ...lesson }, at('2026-11-11T18:59:59Z')).allowed,
    ).toBe(true);
  });

  it('BR-30: ustoz — dars kunidan keyin (Toshkentda 00:00 dan) yopiq', () => {
    expect(canMarkAttendance({ role: 'teacher', ...lesson }, at('2026-11-11T19:00:00Z'))).toEqual({
      allowed: false,
      reason: 'ATTENDANCE_WINDOW_CLOSED',
    });
  });

  it('BR-30: Admin — keyin ham; bekor qilingan dars — hech kimga', () => {
    expect(
      canMarkAttendance({ role: 'admin', ...lesson }, at('2026-11-20T10:00:00Z')).allowed,
    ).toBe(true);
    expect(
      canMarkAttendance(
        { role: 'admin', lessonDate: '2026-11-11', lessonStatus: 'cancelled' },
        at('2026-11-11T10:00:00Z'),
      ),
    ).toEqual({ allowed: false, reason: 'LESSON_CANCELLED' });
  });
});

describe('BR-37: canWriteGrade', () => {
  it("BR-37: dars kuni + 3 kun (23:59 gacha) — ruxsat, 4-kun — yo'q", () => {
    const g = { role: 'teacher' as const, lessonDate: '2026-11-11' };
    expect(canWriteGrade(g, at('2026-11-14T18:59:00Z')).allowed).toBe(true);
    expect(canWriteGrade(g, at('2026-11-14T19:00:00Z')).allowed).toBe(false);
    expect(canWriteGrade(g, at('2026-11-10T10:00:00Z')).allowed).toBe(false); // darsdan oldin
  });

  it('addDays oy/yil chegarasida', () => {
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });
});

describe('BR-16: canReversePayment', () => {
  it('BR-16: Admin — faqat shu kuni (Toshkent); keyin — tasdiq kerak; Director — har doim', () => {
    const created = at('2026-11-11T04:00:00Z');
    expect(
      canReversePayment({ role: 'admin', paymentCreatedAt: created }, at('2026-11-11T18:00:00Z'))
        .allowed,
    ).toBe(true);
    expect(
      canReversePayment({ role: 'admin', paymentCreatedAt: created }, at('2026-11-11T19:00:00Z')),
    ).toEqual({
      allowed: false,
      reason: 'REQUIRES_APPROVAL',
    });
    expect(
      canReversePayment({ role: 'director', paymentCreatedAt: created }, at('2027-01-01T00:00:00Z'))
        .allowed,
    ).toBe(true);
  });
});

describe('BR-18: canGrantDiscount', () => {
  it("BR-18: Admin ≤ limit; undan yuqori — tasdiq; noto'g'ri foiz — rad", () => {
    expect(canGrantDiscount({ role: 'admin', percent: 10, adminLimitPercent: 10 }).allowed).toBe(
      true,
    );
    expect(canGrantDiscount({ role: 'admin', percent: 11, adminLimitPercent: 10 })).toEqual({
      allowed: false,
      reason: 'REQUIRES_APPROVAL',
    });
    expect(canGrantDiscount({ role: 'director', percent: 50, adminLimitPercent: 10 }).allowed).toBe(
      true,
    );
    expect(
      canGrantDiscount({ role: 'director', percent: 101, adminLimitPercent: 10 }).allowed,
    ).toBe(false);
    expect(canGrantDiscount({ role: 'admin', percent: 5.5, adminLimitPercent: 10 }).allowed).toBe(
      false,
    );
  });
});

describe('BR-27: canEditPayroll', () => {
  it('BR-27: faqat draft', () => {
    expect(canEditPayroll('draft').allowed).toBe(true);
    expect(canEditPayroll('approved').allowed).toBe(false);
    expect(canEditPayroll('paid').allowed).toBe(false);
  });
});

describe('BR-13: canReviewSubmission', () => {
  const now = at('2026-11-11T10:00:00Z');
  const base = {
    status: 'pending_review' as const,
    reviewerId: 'a1',
    lockedBy: null,
    lockedUntil: null,
  };

  it("BR-13: bo'sh yoki o'zi ochgan — ruxsat; boshqa Admin 5 daq ichida ochgan — yo'q", () => {
    expect(canReviewSubmission(base, now).allowed).toBe(true);
    expect(
      canReviewSubmission({ ...base, lockedBy: 'a1', lockedUntil: at('2026-11-11T10:04:00Z') }, now)
        .allowed,
    ).toBe(true);
    expect(
      canReviewSubmission(
        { ...base, lockedBy: 'a2', lockedUntil: at('2026-11-11T10:04:00Z') },
        now,
      ),
    ).toEqual({
      allowed: false,
      reason: 'LOCKED_BY_OTHER',
    });
    expect(
      canReviewSubmission({ ...base, lockedBy: 'a2', lockedUntil: at('2026-11-11T09:59:00Z') }, now)
        .allowed,
    ).toBe(true);
  });

  it("BR-13: allaqachon ko'rilgan — rad", () => {
    expect(canReviewSubmission({ ...base, status: 'confirmed' }, now)).toEqual({
      allowed: false,
      reason: 'ALREADY_REVIEWED',
    });
  });
});
