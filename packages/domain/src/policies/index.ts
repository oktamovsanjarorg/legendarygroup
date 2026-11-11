import { formatDateToYmd } from '../clock.js';

/**
 * Policy qoidalari (02-roles-permissions.md §6) — sof funksiyalar, vaqt tashqaridan (`now`).
 * Kunlar `Asia/Tashkent` kalendari bo'yicha (CLAUDE.md "Vaqt").
 * RBAC (ruxsat bormi) va scope (o'z obyektimi) — alohida qatlamlar; bu yerda faqat holat/vaqt.
 */

export type PolicyResult = { allowed: true } | { allowed: false; reason: string };
const allow: PolicyResult = { allowed: true };
const deny = (reason: string): PolicyResult => ({ allowed: false, reason });

/** `YYYY-MM-DD` + n kun (taqvim bo'yicha, UTC arifmetikasi — DST yo'q). */
export function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type StaffRole = 'director' | 'admin' | 'teacher';

/** BR-30: Ustoz — faqat dars kuni (00:00–23:59, Toshkent); dars bekor qilinmagan. Admin/Director — har doim. */
export function canMarkAttendance(
  input: { role: StaffRole; lessonDate: string; lessonStatus: 'scheduled' | 'done' | 'cancelled' },
  now: Date,
): PolicyResult {
  if (input.lessonStatus === 'cancelled') return deny('LESSON_CANCELLED');
  if (input.role !== 'teacher') return allow;
  return formatDateToYmd(now) === input.lessonDate ? allow : deny('ATTENDANCE_WINDOW_CLOSED');
}

/** BR-37: Ustoz — dars kunidan 3 kun ichida (oxirgi kun 23:59 gacha). */
export function canWriteGrade(
  input: { role: StaffRole; lessonDate: string },
  now: Date,
): PolicyResult {
  if (input.role !== 'teacher') return allow;
  const today = formatDateToYmd(now);
  return today >= input.lessonDate && today <= addDays(input.lessonDate, 3)
    ? allow
    : deny('GRADE_WINDOW_CLOSED');
}

/** BR-16: Admin — faqat shu kuni kiritilgan to'lovni; keyin — Director (yoki T-119 so'rovi). */
export function canReversePayment(
  input: { role: 'director' | 'admin'; paymentCreatedAt: Date },
  now: Date,
): PolicyResult {
  if (input.role === 'director') return allow;
  return formatDateToYmd(input.paymentCreatedAt) === formatDateToYmd(now)
    ? allow
    : deny('REQUIRES_APPROVAL');
}

/** BR-18: Admin — foiz ≤ sozlamadagi limit; undan yuqori — Director tasdig'i (T-119). */
export function canGrantDiscount(input: {
  role: 'director' | 'admin';
  percent: number;
  adminLimitPercent: number;
}): PolicyResult {
  if (!Number.isInteger(input.percent) || input.percent < 0 || input.percent > 100) {
    return deny('INVALID_PERCENT');
  }
  if (input.role === 'director') return allow;
  return input.percent <= input.adminLimitPercent ? allow : deny('REQUIRES_APPROVAL');
}

/** BR-27: oylik hisob faqat `draft` holatda tahrirlanadi. */
export const canEditPayroll = (status: 'draft' | 'approved' | 'paid'): PolicyResult =>
  status === 'draft' ? allow : deny('PAYROLL_LOCKED');

/** BR-13: chek faqat `pending_review` va boshqa Admin hozir ochib turmagan bo'lsa (lock 5 daq). */
export function canReviewSubmission(
  input: {
    status: 'pending_review' | 'confirmed' | 'rejected';
    reviewerId: string;
    lockedBy: string | null;
    lockedUntil: Date | null;
  },
  now: Date,
): PolicyResult {
  if (input.status !== 'pending_review') return deny('ALREADY_REVIEWED');
  const lockedByOther =
    input.lockedBy !== null &&
    input.lockedBy !== input.reviewerId &&
    input.lockedUntil !== null &&
    input.lockedUntil > now;
  return lockedByOther ? deny('LOCKED_BY_OTHER') : allow;
}
