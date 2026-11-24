import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type CashClosing,
  type CashClosingListQueryInput,
  type CloseCashInput,
  DEFAULT_BRANCH_ID,
  type Permission,
  type RefundPaymentInput,
  type ReversePaymentInput,
} from '@lg/contracts';
import {
  type CashClosingRow,
  type Database,
  isUniqueViolation,
  type PaymentRow,
  type ReceiptRow,
  type Transaction,
} from '@lg/db';
import { type Clock, formatDateToYmd } from '@lg/domain';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { PermissionsService } from '../rbac/index.js';
import { StudentScopeService } from '../students/index.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { StornoCashRepository } from './storno-cash.repository.js';
import { serializeCashClosing } from './storno-cash.serializer.js';

interface ReversalTxParams {
  payment: PaymentRow;
  receipt: ReceiptRow;
  input: ReversePaymentInput;
  user: RequestUser;
  ctx: AuditContext;
}

@Injectable()
export class StornoCashService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(StornoCashRepository) private readonly repo: StornoCashRepository,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(BillingBalanceRepository) private readonly balance: BillingBalanceRepository,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
  ) {}

  async reversePayment(
    paymentId: string,
    input: ReversePaymentInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<{ paymentId: string; reversalId: string }> {
    const payment = await this.repo.findPaymentById(paymentId);
    if (!payment) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    if (payment.amount <= 0n)
      throw new AppException(HttpStatus.BAD_REQUEST, 'REVERSAL_OF_REVERSAL');
    const receipt = await this.repo.findReceiptByPaymentId(paymentId);
    if (!receipt) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    // 02 §5: kiritilgan kundan keyingi storno — faqat tasdiqlash huquqi bor foydalanuvchi.
    const sameDay = formatDateToYmd(payment.paidAt) === formatDateToYmd(this.clock.now());
    if (!sameDay && !(await this.can(user, 'approval.decide'))) {
      throw new AppException(HttpStatus.FORBIDDEN, 'REVERSAL_NEEDS_APPROVAL');
    }

    try {
      return await this.db.transaction((tx) =>
        this.executeReversalTx(tx, { payment, receipt, input, user, ctx }),
      );
    } catch (err) {
      if (isUniqueViolation(err)) throw new AppException(HttpStatus.CONFLICT, 'ALREADY_REVERSED');
      throw err;
    }
  }

  private async executeReversalTx(
    tx: Transaction,
    p: ReversalTxParams,
  ): Promise<{ paymentId: string; reversalId: string }> {
    await this.balance.lockStudent(tx, p.payment.studentId);
    if (await this.repo.findReversalOf(p.payment.id, tx)) {
      throw new AppException(HttpStatus.CONFLICT, 'ALREADY_REVERSED');
    }
    const reversal = await this.repo.insertPayment(
      {
        branchId: p.payment.branchId,
        studentId: p.payment.studentId,
        amount: -p.payment.amount,
        method: p.payment.method,
        paidAt: this.clock.now(),
        receivedBy: p.user.id,
        reversalOf: p.payment.id,
      },
      tx,
    );
    await this.repo.insertReceiptCancellation(
      {
        receiptId: p.receipt.id,
        reversalPaymentId: reversal.id,
        reason: p.input.reason,
        createdBy: p.user.id,
      },
      tx,
    );
    await this.repo.insertLedgerEntry(
      {
        branchId: p.payment.branchId,
        studentId: p.payment.studentId,
        entryType: 'reversal',
        amount: p.payment.amount,
        refTable: 'payments',
        refId: reversal.id,
      },
      tx,
    );
    // Bo'shagan qatorlarga boshqa to'lovlarning avansi qo'llanadi, keyin holatlar.
    await this.balance.applyAdvance(tx, p.payment.studentId);
    await this.balance.refreshInvoiceStatuses(tx, p.payment.studentId);
    await this.audit.record(
      p.ctx,
      {
        action: 'billing.payment.reverse',
        entity: 'payment',
        entityId: p.payment.id,
        after: { reversalPaymentId: reversal.id, reason: p.input.reason },
      },
      tx,
    );
    return { paymentId: p.payment.id, reversalId: reversal.id };
  }

  /** FR-PAY-6: refund — faqat mavjud avans doirasida (qarz turgan pulni qaytarib bo'lmaydi). */
  async refundPayment(
    input: RefundPaymentInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<{ refundId: string; amount: string }> {
    await this.studentScope.assertVisible(user, input.studentId);
    const amountBig = BigInt(input.amount);
    return this.db.transaction(async (tx: Transaction) => {
      await this.balance.lockStudent(tx, input.studentId);
      if (amountBig > (await this.balance.availableAdvance(tx, input.studentId))) {
        throw new AppException(HttpStatus.CONFLICT, 'REFUND_EXCEEDS_ADVANCE');
      }
      const refund = await this.repo.insertPayment(
        {
          studentId: input.studentId,
          amount: -amountBig,
          method: input.method,
          paidAt: this.clock.now(),
          receivedBy: user.id,
        },
        tx,
      );
      await this.repo.insertLedgerEntry(
        {
          studentId: input.studentId,
          entryType: 'refund',
          amount: amountBig,
          refTable: 'payments',
          refId: refund.id,
        },
        tx,
      );
      await this.audit.record(
        ctx,
        {
          action: 'billing.payment.refund',
          entity: 'payment',
          entityId: refund.id,
          after: { amount: input.amount, reason: input.reason },
        },
        tx,
      );
      return { refundId: refund.id, amount: input.amount };
    });
  }

  private async can(user: RequestUser, permission: Permission): Promise<boolean> {
    return (await this.permissions.forUser(user.id, user.role, user.pv)).has(permission);
  }

  async closeCash(
    input: CloseCashInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<CashClosing> {
    if (input.date > this.clock.today())
      throw new AppException(HttpStatus.BAD_REQUEST, 'CASH_DATE_IN_FUTURE');
    const row = await this.db
      .transaction((tx) => this.insertClosing(tx, input, user, ctx))
      .catch((err: unknown) => {
        if (isUniqueViolation(err, 'cash_closings_branch_date_uq'))
          throw new AppException(HttpStatus.CONFLICT, 'CASH_ALREADY_CLOSED');
        throw err;
      });
    return serializeCashClosing({ ...row, closedByName: null });
  }

  private async insertClosing(
    tx: Transaction,
    input: CloseCashInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<CashClosingRow> {
    if (await this.repo.findCashClosingByDate(input.date, DEFAULT_BRANCH_ID, tx))
      throw new AppException(HttpStatus.CONFLICT, 'CASH_ALREADY_CLOSED');
    const expectedCash = await this.repo.sumCashPaymentsForDate(input.date, DEFAULT_BRANCH_ID, tx);
    const countedCash = BigInt(input.countedCash);
    const diff = countedCash - expectedCash;
    if (diff !== 0n && !input.note)
      throw new AppException(HttpStatus.BAD_REQUEST, 'CASH_DIFF_NOTE_REQUIRED');
    const inserted = await this.repo.insertCashClosing(
      {
        branchId: DEFAULT_BRANCH_ID,
        date: input.date,
        expectedCash,
        countedCash,
        diff,
        closedBy: user.id,
        note: input.note || null,
      },
      tx,
    );
    await this.audit.record(
      ctx,
      {
        action: 'billing.cash.close',
        entity: 'cash_closings',
        entityId: inserted.id,
        after: { date: input.date, expectedCash: expectedCash.toString(), diff: diff.toString() },
      },
      tx,
    );
    return inserted;
  }

  async getExpectedCash(dateStr: string): Promise<{ date: string; expectedCash: string }> {
    const branchId = DEFAULT_BRANCH_ID;
    const total = await this.repo.sumCashPaymentsForDate(dateStr, branchId);
    return { date: dateStr, expectedCash: total.toString() };
  }

  async getCashClosings(query: CashClosingListQueryInput): Promise<CashClosing[]> {
    const branchId = DEFAULT_BRANCH_ID;
    const rows = await this.repo.findCashClosings(query, branchId);
    return rows.map(serializeCashClosing);
  }
}
