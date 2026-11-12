import type { EnrollmentDto, FreezeDto } from '@lg/contracts';
import type { EnrollmentFreezeRow, EnrollmentRow } from '@lg/db';
import { enrollmentState } from '@lg/domain';

export const freezeSpan = (f: EnrollmentFreezeRow) => ({ from: f.fromDate, to: f.toDate });
export const enrollmentSpan = (e: EnrollmentRow) => ({ from: e.startDate, to: e.endDate });

export function toFreeze(f: EnrollmentFreezeRow): FreezeDto {
  return { id: f.id, from: f.fromDate, to: f.toDate, reason: f.reason, approvedBy: f.approvedBy };
}

export function toEnrollment(
  e: EnrollmentRow,
  groupName: string,
  freezes: readonly EnrollmentFreezeRow[],
  today: string,
): EnrollmentDto {
  return {
    id: e.id,
    studentId: e.studentId,
    group: { id: e.groupId, name: groupName },
    startDate: e.startDate,
    endDate: e.endDate,
    endReason: e.endReason,
    discountPercent: e.discountPercent,
    state: enrollmentState(enrollmentSpan(e), freezes.map(freezeSpan), today),
    freezes: freezes.map(toFreeze),
  };
}

/** Audit uchun (PII yo'q). */
export const enrollmentAudit = (e: EnrollmentRow) => ({
  studentId: e.studentId,
  groupId: e.groupId,
  startDate: e.startDate,
  endDate: e.endDate,
  endReason: e.endReason,
});
