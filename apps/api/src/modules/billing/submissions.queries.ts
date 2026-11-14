import {
  type Database,
  enrollments,
  groups,
  guardians,
  paymentSubmissions,
  type PaymentSubmissionRow,
  receipts,
  students,
} from '@lg/db';
import { and, desc, eq, isNull } from 'drizzle-orm';

export interface EnrichedSubmissionRow extends PaymentSubmissionRow {
  studentName: string;
  studentCode: number;
  groupName: string;
  guardianName: string;
  receiptNumber?: string;
}

export async function findEnrichedSubmissionById(
  db: Database,
  id: string,
): Promise<EnrichedSubmissionRow | null> {
  const [row] = await db
    .select({
      submission: paymentSubmissions,
      studentName: students.fullName,
      studentCode: students.code,
      guardianName: guardians.fullName,
    })
    .from(paymentSubmissions)
    .innerJoin(students, eq(students.id, paymentSubmissions.studentId))
    .innerJoin(guardians, eq(guardians.id, paymentSubmissions.guardianId))
    .where(eq(paymentSubmissions.id, id));
  if (!row) return null;

  const [enroll] = await db
    .select({ groupName: groups.name })
    .from(enrollments)
    .innerJoin(groups, eq(groups.id, enrollments.groupId))
    .where(and(eq(enrollments.studentId, row.submission.studentId), isNull(enrollments.endDate)))
    .limit(1);

  let receiptNumber: string | undefined;
  if (row.submission.paymentId) {
    const [rc] = await db
      .select({ number: receipts.number })
      .from(receipts)
      .where(eq(receipts.paymentId, row.submission.paymentId));
    receiptNumber = rc?.number;
  }

  return {
    ...row.submission,
    studentName: row.studentName,
    studentCode: Number(row.studentCode),
    groupName: enroll?.groupName ?? '—',
    guardianName: row.guardianName,
    receiptNumber,
  };
}

export async function findGuardianSubmissions(
  db: Database,
  guardianId: string,
): Promise<EnrichedSubmissionRow[]> {
  const rows = await db
    .select({
      submission: paymentSubmissions,
      studentName: students.fullName,
      studentCode: students.code,
      guardianName: guardians.fullName,
    })
    .from(paymentSubmissions)
    .innerJoin(students, eq(students.id, paymentSubmissions.studentId))
    .innerJoin(guardians, eq(guardians.id, paymentSubmissions.guardianId))
    .where(eq(paymentSubmissions.guardianId, guardianId))
    .orderBy(desc(paymentSubmissions.createdAt));

  return rows.map((r) => ({
    ...r.submission,
    studentName: r.studentName,
    studentCode: Number(r.studentCode),
    groupName: '—',
    guardianName: r.guardianName,
  }));
}

export async function findSubmissionsQueue(
  db: Database,
  status?: PaymentSubmissionRow['status'],
): Promise<EnrichedSubmissionRow[]> {
  const cond = status ? eq(paymentSubmissions.status, status) : undefined;
  const rows = await db
    .select({
      submission: paymentSubmissions,
      studentName: students.fullName,
      studentCode: students.code,
      guardianName: guardians.fullName,
    })
    .from(paymentSubmissions)
    .innerJoin(students, eq(students.id, paymentSubmissions.studentId))
    .innerJoin(guardians, eq(guardians.id, paymentSubmissions.guardianId))
    .where(cond)
    .orderBy(desc(paymentSubmissions.createdAt));

  return rows.map((r) => ({
    ...r.submission,
    studentName: r.studentName,
    studentCode: Number(r.studentCode),
    groupName: '—',
    guardianName: r.guardianName,
  }));
}
