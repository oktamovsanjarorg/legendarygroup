import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  enrollments,
  groups,
  guardians,
  type NewPaymentSubmissionRow,
  paymentSubmissions,
  type PaymentSubmissionRow,
  receipts,
  students,
  type Transaction,
} from '@lg/db';
import { allocateFifo } from '@lg/domain';
import { and, desc, eq, gte, inArray, isNull } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { BillingRepository } from './billing.repository.js';

export interface EnrichedSubmissionRow extends PaymentSubmissionRow {
  studentName: string;
  studentCode: number;
  groupName: string;
  guardianName: string;
  receiptNumber?: string;
}

@Injectable()
export class SubmissionsRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(BillingRepository) private readonly billingRepo: BillingRepository,
  ) {}

  async createSubmission(data: NewPaymentSubmissionRow): Promise<PaymentSubmissionRow> {
    const [row] = await this.db.insert(paymentSubmissions).values(data).returning();
    if (!row) throw new Error('SUBMISSION_CREATE_FAILED');
    return row;
  }

  async findSubmissionById(id: string): Promise<PaymentSubmissionRow | null> {
    const [row] = await this.db
      .select()
      .from(paymentSubmissions)
      .where(eq(paymentSubmissions.id, id));
    return row ?? null;
  }

  async findEnrichedById(id: string): Promise<EnrichedSubmissionRow | null> {
    const [row] = await this.db
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

    const [enroll] = await this.db
      .select({ groupName: groups.name })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(and(eq(enrollments.studentId, row.submission.studentId), isNull(enrollments.endDate)))
      .limit(1);

    let receiptNumber: string | undefined;
    if (row.submission.paymentId) {
      const [rc] = await this.db
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

  async findSubmissionsByGuardian(guardianId: string): Promise<EnrichedSubmissionRow[]> {
    const rows = await this.db
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

  async findQueue(status?: PaymentSubmissionRow['status']): Promise<EnrichedSubmissionRow[]> {
    const cond = status ? eq(paymentSubmissions.status, status) : undefined;
    const rows = await this.db
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

  async lockSubmission(
    id: string,
    userId: string,
    lockedUntil: Date,
  ): Promise<PaymentSubmissionRow | null> {
    const [row] = await this.db
      .update(paymentSubmissions)
      .set({ reviewLockedBy: userId, reviewLockedUntil: lockedUntil, updatedAt: new Date() })
      .where(and(eq(paymentSubmissions.id, id), eq(paymentSubmissions.status, 'pending_review')))
      .returning();
    return row ?? null;
  }

  async rejectSubmission(
    id: string,
    userId: string,
    reason: string,
  ): Promise<PaymentSubmissionRow | null> {
    const [row] = await this.db
      .update(paymentSubmissions)
      .set({
        status: 'rejected',
        rejectReason: reason,
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewLockedBy: null,
        reviewLockedUntil: null,
        updatedAt: new Date(),
      })
      .where(and(eq(paymentSubmissions.id, id), eq(paymentSubmissions.status, 'pending_review')))
      .returning();
    return row ?? null;
  }

  /** BR-15 Dublikat tekshiruvi: bir xil fayl yoki 10 daqiqa ichida bir xil summa. */
  async checkDuplicate(params: {
    studentId: string;
    amount: bigint;
    fileId?: string;
    thresholdMinutes?: number;
  }): Promise<{ isDuplicate: boolean; reason?: string }> {
    const { studentId, amount, fileId, thresholdMinutes = 10 } = params;

    if (fileId) {
      const [byFile] = await this.db
        .select({ id: paymentSubmissions.id })
        .from(paymentSubmissions)
        .where(
          and(
            eq(paymentSubmissions.fileId, fileId),
            eq(paymentSubmissions.status, 'pending_review'),
          ),
        );
      if (byFile)
        return { isDuplicate: true, reason: 'Aynan shu chek fayli allaqachon yuborilgan.' };
    }

    const tenMinAgo = new Date(Date.now() - thresholdMinutes * 60 * 1000);
    const [byAmountAndTime] = await this.db
      .select({ id: paymentSubmissions.id })
      .from(paymentSubmissions)
      .where(
        and(
          eq(paymentSubmissions.studentId, studentId),
          eq(paymentSubmissions.amountClaimed, amount),
          gte(paymentSubmissions.createdAt, tenMinAgo),
          inArray(paymentSubmissions.status, ['pending_review', 'confirmed']),
        ),
      );

    if (byAmountAndTime) {
      return {
        isDuplicate: true,
        reason: `So'nggi ${thresholdMinutes} daqiqa ichida shu o'quvchiga aynan shunday summa yuborilgan.`,
      };
    }

    return { isDuplicate: false };
  }

  /** Chekni tasdiqlab to'lov va kvitansiya yaratadi (BR-13, BR-19). */
  async confirmSubmissionTx(p: {
    submissionId: string;
    userId: string;
    finalAmount: bigint;
    branchId: string;
    verifyToken: string;
  }): Promise<{ paymentId: string; receiptNumber: string }> {
    return this.db.transaction(async (tx) => {
      const [sub] = await tx
        .select()
        .from(paymentSubmissions)
        .where(
          and(
            eq(paymentSubmissions.id, p.submissionId),
            eq(paymentSubmissions.status, 'pending_review'),
          ),
        );
      if (!sub) throw new Error('ALREADY_REVIEWED');

      const { paymentId, receiptNumber } = await this.recordPaymentAndReceipt(tx, {
        studentId: sub.studentId,
        submissionId: sub.id,
        amount: p.finalAmount,
        userId: p.userId,
        verifyToken: p.verifyToken,
      });

      await tx
        .update(paymentSubmissions)
        .set({
          status: 'confirmed',
          reviewedBy: p.userId,
          reviewedAt: new Date(),
          paymentId,
          reviewLockedBy: null,
          reviewLockedUntil: null,
          updatedAt: new Date(),
        })
        .where(eq(paymentSubmissions.id, p.submissionId));

      return { paymentId, receiptNumber };
    });
  }

  private async recordPaymentAndReceipt(
    tx: Transaction,
    p: {
      studentId: string;
      submissionId: string;
      amount: bigint;
      userId: string;
      verifyToken: string;
    },
  ): Promise<{ paymentId: string; receiptNumber: string }> {
    const openLines = await this.billingRepo.findOpenInvoiceLinesForStudent(tx, p.studentId);
    const allocation = allocateFifo(
      p.amount,
      openLines.map((l) => ({ id: l.id, dueDate: l.dueDate, outstanding: l.outstanding })),
    );

    const payment = await this.billingRepo.insertPayment(tx, {
      studentId: p.studentId,
      amount: p.amount,
      method: 'bank',
      paidAt: new Date(),
      receivedBy: p.userId,
      submissionId: p.submissionId,
    });

    const receiptNumber = await this.billingRepo.getNextReceiptNumber(tx, new Date().getFullYear());
    await this.billingRepo.insertReceipt(tx, {
      number: receiptNumber,
      paymentId: payment.id,
      verifyToken: p.verifyToken,
    });

    const allocs = allocation.parts.map((part) => ({
      paymentId: payment.id,
      invoiceLineId: part.id,
      amount: part.amount,
    }));
    await this.billingRepo.insertPaymentAllocations(tx, allocs);

    await this.billingRepo.insertLedgerEntries(tx, [
      {
        studentId: p.studentId,
        entryType: 'payment',
        amount: -p.amount,
        refTable: 'payments',
        refId: payment.id,
        occurredAt: new Date(),
      },
    ]);

    return { paymentId: payment.id, receiptNumber };
  }
}
