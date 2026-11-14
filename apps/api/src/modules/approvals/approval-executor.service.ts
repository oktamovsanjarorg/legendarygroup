import { Inject, Injectable, Logger } from '@nestjs/common';
import type {
  AttendanceEditPayload,
  DiscountPayload,
  RefundPayload,
  ReversalPayload,
} from '@lg/contracts';
import {
  attendance,
  enrollments,
  ledgerEntries,
  payments,
  receiptCancellations,
  receipts,
  type Transaction,
} from '@lg/db';
import { type Clock, formatDateToYmd } from '@lg/domain';
import { and, eq, sql } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import type { ApprovalWithUsers } from './approvals.repository.js';

@Injectable()
export class ApprovalExecutorService {
  private readonly logger = new Logger(ApprovalExecutorService.name);

  constructor(@Inject(CLOCK_TOKEN) private readonly clock: Clock) {}

  /** Tasdiqlangan so'rov turiga ko'ra tegishli amalni bajaradi (docs/02 §5) */
  async execute(req: ApprovalWithUsers, tx: Transaction): Promise<void> {
    switch (req.type) {
      case 'reversal':
        await this.executeReversal(req, tx);
        break;
      case 'refund':
        await this.executeRefund(req, tx);
        break;
      case 'discount':
        await this.executeDiscount(req, tx);
        break;
      case 'attendance_edit':
        await this.executeAttendanceEdit(req, tx);
        break;
      default:
        this.logger.warn(`Noma'lum approval turi: ${req.type}`);
    }
  }

  private async executeReversal(req: ApprovalWithUsers, tx: Transaction): Promise<void> {
    const payload = req.payload as ReversalPayload;
    const [pmt] = await tx.select().from(payments).where(eq(payments.id, payload.paymentId));
    if (!pmt) {
      this.logger.warn(`Storno uchun to'lov topilmadi: ${payload.paymentId}`);
      return;
    }

    const now = this.clock.now();
    const [rev] = await tx
      .insert(payments)
      .values({
        branchId: pmt.branchId,
        studentId: pmt.studentId,
        amount: -pmt.amount,
        method: pmt.method,
        paidAt: now,
        receivedBy: req.decidedBy ?? req.requestedBy,
        reversalOf: pmt.id,
      })
      .returning();

    if (rev) {
      await tx.insert(ledgerEntries).values({
        branchId: pmt.branchId,
        studentId: pmt.studentId,
        entryType: 'reversal',
        amount: -pmt.amount,
        refTable: 'payments',
        refId: rev.id,
      });

      const [rcpt] = await tx.select().from(receipts).where(eq(receipts.paymentId, pmt.id));
      if (rcpt) {
        await tx.insert(receiptCancellations).values({
          receiptId: rcpt.id,
          reversalPaymentId: rev.id,
          reason: payload.reason,
          createdBy: req.decidedBy ?? req.requestedBy,
        });
      }
    }
  }

  private async executeRefund(req: ApprovalWithUsers, tx: Transaction): Promise<void> {
    const payload = req.payload as RefundPayload;
    const [pmt] = await tx.select().from(payments).where(eq(payments.id, payload.paymentId));
    if (!pmt) {
      this.logger.warn(`Refund uchun to'lov topilmadi: ${payload.paymentId}`);
      return;
    }

    const now = this.clock.now();
    const refundAmount = BigInt(payload.amount);
    const [ref] = await tx
      .insert(payments)
      .values({
        branchId: pmt.branchId,
        studentId: pmt.studentId,
        amount: -refundAmount,
        method: pmt.method,
        paidAt: now,
        receivedBy: req.decidedBy ?? req.requestedBy,
      })
      .returning();

    if (ref) {
      await tx.insert(ledgerEntries).values({
        branchId: pmt.branchId,
        studentId: pmt.studentId,
        entryType: 'refund',
        amount: refundAmount,
        refTable: 'payments',
        refId: ref.id,
      });
    }
  }

  private async executeDiscount(req: ApprovalWithUsers, tx: Transaction): Promise<void> {
    const payload = req.payload as DiscountPayload;
    const today = formatDateToYmd(this.clock.now());

    await tx
      .update(enrollments)
      .set({ discountPercent: payload.percent })
      .where(
        and(
          eq(enrollments.studentId, payload.studentId),
          sql`(${enrollments.endDate} IS NULL OR ${enrollments.endDate} >= ${today})`,
        ),
      );
  }

  private async executeAttendanceEdit(req: ApprovalWithUsers, tx: Transaction): Promise<void> {
    const payload = req.payload as AttendanceEditPayload;
    const statusMap: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {
      attended: 'present',
      late: 'late',
      excused: 'excused',
      unexcused: 'absent',
    };
    const targetStatus = statusMap[payload.status] ?? 'present';

    await tx
      .update(attendance)
      .set({
        status: targetStatus,
        note: payload.reason,
      })
      .where(
        and(eq(attendance.lessonId, payload.lessonId), eq(attendance.studentId, payload.studentId)),
      );
  }
}
