import type {
  ApprovalRequest as ApiApproval,
  DirectorDashboardKpi,
  PaymentSubmission,
  StudentListRow,
} from '@lg/contracts';
import { formatMoney, miniappMessages as t } from '@lg/i18n';
import type { ApprovalRequest } from '../screens/staff/approvals.js';
import type { StaffKpi } from '../screens/staff/dashboard.js';
import type { QueueItem } from '../screens/staff/review.js';
import type { StudentHit } from '../screens/staff/search.js';

export const staffKpi = (k: DirectorDashboardKpi, isDirector: boolean): StaffKpi => ({
  revenue: BigInt(k.revenueToday),
  revenueYesterday: BigInt(k.revenueYesterday),
  attendancePercent: k.attendance,
  unmarkedLessons: k.unmarked,
  absentToday: k.absentToday,
  queue: k.queue,
  // Tasdiqlash so'rovlari — faqat Director qaror qiladi (approval.decide).
  approvals: isDirector ? k.approvals : undefined,
});

const DAY_MS = 86_400_000;

/** BR-15: shu o'quvchi, shu summa, 24 soat ichida boshqa chek — ogohlantirish (bloklamaydi). */
function duplicateOf(s: PaymentSubmission, all: readonly PaymentSubmission[]) {
  const at = Date.parse(s.createdAt);
  const twin = all.find(
    (o) =>
      o.id !== s.id &&
      o.studentId === s.studentId &&
      o.amountClaimed === s.amountClaimed &&
      Math.abs(Date.parse(o.createdAt) - at) < DAY_MS,
  );
  return twin
    ? { sentAt: new Date(twin.createdAt), amount: BigInt(twin.amountClaimed) }
    : undefined;
}

export const queueItem = (
  s: PaymentSubmission,
  all: readonly PaymentSubmission[],
  imageUrl: string,
  meId: string,
): QueueItem => ({
  id: s.id,
  imageUrl,
  studentName: s.studentName ?? '',
  groupName: s.groupName ?? '',
  guardianName: s.guardianName ?? '',
  amount: BigInt(s.amountClaimed),
  comment: s.comment ?? undefined,
  sentAt: new Date(s.createdAt),
  duplicateOf: duplicateOf(s, all),
  // Yumshoq lock (5 daq): boshqa Admin ochib turibdi.
  lockedBy:
    s.reviewLockedBy &&
    s.reviewLockedBy !== meId &&
    s.reviewLockedUntil &&
    Date.parse(s.reviewLockedUntil) > Date.now()
      ? (s.reviewLockedByName ?? '')
      : undefined,
});

const str = (v: unknown): string =>
  typeof v === 'string' || typeof v === 'number' ? String(v) : '';

/** So'rov tafsiloti (payload) — o'qiladigan qatorlar. */
function details(a: ApiApproval): { label: string; value: string }[] {
  const p = a.payload;
  const f = t.approvals.fields;
  const rows: { label: string; value: string }[] = [];
  if (p['percent'] !== undefined) rows.push({ label: f.percent, value: `${str(p['percent'])}%` });
  if (p['amount'] !== undefined)
    rows.push({ label: f.amount, value: formatMoney(BigInt(str(p['amount']))) });
  const status = str(p['status']);
  if (status in t.approvals.attendance)
    rows.push({
      label: f.status,
      value: t.approvals.attendance[status as keyof typeof t.approvals.attendance],
    });
  return rows;
}

export const approvalRequest = (a: ApiApproval): ApprovalRequest => ({
  id: a.id,
  type: a.type,
  requestedBy: a.requestedByName ?? '',
  reason: a.reason,
  details: details(a),
  expiresAt: new Date(a.expiresAt),
});

export const studentHit = (s: StudentListRow, debt: bigint): StudentHit => ({
  id: s.id,
  code: `LG-${s.code}`,
  name: s.fullName,
  phone: s.guardian?.phone ?? s.phone ?? '',
  groups: s.groups.map((g) => g.name),
  debt,
});
