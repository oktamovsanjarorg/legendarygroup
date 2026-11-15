import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { PaymentView } from '@lg/contracts';
import {
  type Database,
  invoiceLines,
  invoices,
  paymentAllocations,
  payments,
  receiptCancellations,
  receipts,
  students,
  users,
} from '@lg/db';
import { type Clock, formatDateToYmd } from '@lg/domain';
import { eq, sql } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { EnvService } from '../../config/env.service.js';
import type { RequestUser } from '../auth/index.js';
import { PermissionsService } from '../rbac/index.js';
import { StudentScopeService } from '../students/index.js';

/**
 * W-17 (FR-PAY-6/8/9): to'lov, chek, oy bo'yicha taqsimot va storno holati bitta javobda.
 * `canReverseNow` — `StornoCashService.reversePayment` bilan bir xil qoida (02 §5, BR-16).
 */
@Injectable()
export class PaymentViewService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(EnvService) private readonly env: EnvService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async view(user: RequestUser, id: string): Promise<PaymentView> {
    const [row] = await this.db
      .select({
        p: payments,
        studentName: students.fullName,
        createdBy: users.fullName,
        receiptNumber: receipts.number,
        verifyToken: receipts.verifyToken,
        cancelReason: receiptCancellations.reason,
        cancelledAt: receiptCancellations.createdAt,
      })
      .from(payments)
      .innerJoin(students, eq(students.id, payments.studentId))
      .leftJoin(users, eq(users.id, payments.receivedBy))
      .leftJoin(receipts, eq(receipts.paymentId, payments.id))
      .leftJoin(receiptCancellations, eq(receiptCancellations.receiptId, receipts.id))
      .where(eq(payments.id, id));
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    await this.studentScope.assertVisible(user, row.p.studentId);
    const perms = await this.permissions.forUser(user.id, user.role, user.pv);
    const sameDay = formatDateToYmd(row.p.paidAt) === formatDateToYmd(this.clock.now());
    return {
      id: row.p.id,
      studentId: row.p.studentId,
      studentName: row.studentName,
      amount: row.p.amount.toString(),
      method: row.p.method,
      paidAt: row.p.paidAt.toISOString(),
      receiptNumber: row.receiptNumber,
      verifyUrl: row.verifyToken
        ? `${this.env.get('PUBLIC_APP_URL')}/verify/${row.verifyToken}`
        : null,
      createdBy: row.createdBy,
      viaSubmission: row.p.submissionId !== null,
      allocations: await this.allocations(id),
      reversed:
        row.cancelReason && row.cancelledAt
          ? { reason: row.cancelReason, at: row.cancelledAt.toISOString() }
          : null,
      canReverseNow: perms.has('payment.reverse') && (sameDay || perms.has('approval.decide')),
    };
  }

  private async allocations(paymentId: string): Promise<PaymentView['allocations']> {
    const rows = await this.db
      .select({
        period: invoices.period,
        amount: sql<string>`sum(${paymentAllocations.amount})::text`,
      })
      .from(paymentAllocations)
      .innerJoin(invoiceLines, eq(invoiceLines.id, paymentAllocations.invoiceLineId))
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .where(eq(paymentAllocations.paymentId, paymentId))
      .groupBy(invoices.period)
      .orderBy(invoices.period);
    return rows;
  }
}
