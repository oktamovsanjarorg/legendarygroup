import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  type NewPaymentSubmissionRow,
  paymentSubmissions,
  type PaymentSubmissionRow,
  type Transaction,
} from '@lg/db';
import { allocateFifo, type Clock } from '@lg/domain';
import { and, eq, gte, inArray } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { BillingRepository } from './billing.repository.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { receiptYear } from './receipt-year.js';
import {
  type EnrichedSubmissionRow,
  findEnrichedSubmissionById,
  findGuardianSubmissions,
  findSubmissionsQueue,
} from './submissions.queries.js';

export type { EnrichedSubmissionRow };

@Injectable()
export class SubmissionsRepository {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(BillingRepository) private readonly billingRepo: BillingRepository,
    @Inject(BillingBalanceRepository) private readonly balance: BillingBalanceRepository,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
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
    return findEnrichedSubmissionById(this.db, id);
  }

  async findSubmissionsByGuardian(guardianId: string): Promise<EnrichedSubmissionRow[]> {
    return findGuardianSubmissions(this.db, guardianId);
  }

  async findQueue(status?: PaymentSubmissionRow['status']): Promise<EnrichedSubmissionRow[]> {
    return findSubmissionsQueue(this.db, status);
  }

  async lockSubmission(
    id: string,
    userId: string,
    lockedUntil: Date,
  ): Promise<PaymentSubmissionRow | null> {
    const [row] = await this.db
      .update(paymentSubmissions)
      .set({ reviewLockedBy: userId, reviewLockedUntil: lockedUntil, updatedAt: this.clock.now() })
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
        reviewedAt: this.clock.now(),
        reviewLockedBy: null,
        reviewLockedUntil: null,
        updatedAt: this.clock.now(),
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

    const tenMinAgo = new Date(this.clock.now().getTime() - thresholdMinutes * 60 * 1000);
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
        )
        .for('update');
      if (!sub) throw new Error('ALREADY_REVIEWED');
      await this.balance.lockStudent(tx, sub.studentId);

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
          reviewedAt: this.clock.now(),
          paymentId,
          reviewLockedBy: null,
          reviewLockedUntil: null,
          updatedAt: this.clock.now(),
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
    const now = this.clock.now();
    const openLines = await this.balance.openLines(tx, p.studentId);
    const allocation = allocateFifo(
      p.amount,
      openLines.map((l) => ({ id: l.id, dueDate: l.dueDate, outstanding: l.outstanding })),
    );

    const payment = await this.billingRepo.insertPayment(tx, {
      studentId: p.studentId,
      amount: p.amount,
      method: 'bank',
      paidAt: now,
      receivedBy: p.userId,
      submissionId: p.submissionId,
    });

    const receiptNumber = await this.billingRepo.getNextReceiptNumber(tx, receiptYear(now));
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
    await this.balance.refreshInvoiceStatuses(tx, p.studentId);

    await this.billingRepo.insertLedgerEntries(tx, [
      {
        studentId: p.studentId,
        entryType: 'payment',
        amount: -p.amount,
        refTable: 'payments',
        refId: payment.id,
        occurredAt: this.clock.now(),
      },
    ]);

    return { paymentId: payment.id, receiptNumber };
  }
}
