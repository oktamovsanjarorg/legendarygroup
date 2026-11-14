import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  CashClosing,
  CashClosingListQueryInput,
  CloseCashInput,
  RefundPaymentInput,
  ReversePaymentInput,
} from '@lg/contracts';
import { type Database, type PaymentRow, type ReceiptRow, type Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { StornoCashRepository } from './storno-cash.repository.js';
import { serializeCashClosing } from './storno-cash.serializer.js';

function isSameCalendarDay(d1: Date, d2: Date): boolean {
  return (
    d1.getUTCFullYear() === d2.getUTCFullYear() &&
    d1.getUTCMonth() === d2.getUTCMonth() &&
    d1.getUTCDate() === d2.getUTCDate()
  );
}

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
  ) {}

  async reversePayment(
    paymentId: string,
    input: ReversePaymentInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<{ paymentId: string; reversalId: string }> {
    const payment = await this.repo.findPaymentById(paymentId);
    if (!payment) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Toʻlov topilmadi');
    if (payment.amount <= 0n) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'BAD_REQUEST',
        'Storno toʻlovini storno qilib boʻlmaydi',
      );
    }

    const receipt = await this.repo.findReceiptByPaymentId(paymentId);
    if (!receipt) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Kvitansiya topilmadi');

    const isCancelled = await this.repo.isReceiptCancelled(receipt.id);
    if (isCancelled) {
      throw new AppException(HttpStatus.CONFLICT, 'CONFLICT', 'Toʻlov allaqachon bekor qilingan');
    }

    if (user.role !== 'director' && !isSameCalendarDay(payment.paidAt, this.clock.now())) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        'Kiritilgan kundan keyingi storno faqat Director tasdigʻi orqali amalga oshiriladi',
      );
    }

    return this.executeReversalTx({ payment, receipt, input, user, ctx });
  }

  private async executeReversalTx(
    p: ReversalTxParams,
  ): Promise<{ paymentId: string; reversalId: string }> {
    return this.db.transaction(async (tx: Transaction) => {
      const reversal = await this.repo.insertPayment(
        {
          branchId: p.payment.branchId,
          studentId: p.payment.studentId,
          amount: -p.payment.amount,
          method: p.payment.method,
          paidAt: this.clock.now(),
          receivedBy: p.user.id,
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
    });
  }

  async refundPayment(
    input: RefundPaymentInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<{ refundId: string; amount: string }> {
    const amountBig = BigInt(input.amount);
    return this.db.transaction(async (tx: Transaction) => {
      const refund = await this.repo.insertPayment(
        {
          branchId: '01900000-0000-7000-8000-000000000001',
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
          branchId: '01900000-0000-7000-8000-000000000001',
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

  async closeCash(
    input: CloseCashInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<CashClosing> {
    const branchId = '01900000-0000-7000-8000-000000000001';
    const existing = await this.repo.findCashClosingByDate(input.date, branchId);
    if (existing) {
      throw new AppException(
        HttpStatus.CONFLICT,
        'CONFLICT',
        'Bu sana uchun kassa allaqachon yopilgan',
      );
    }

    const expectedCash = await this.repo.sumCashPaymentsForDate(input.date, branchId);
    const countedCash = BigInt(input.countedCash);
    const diff = countedCash - expectedCash;

    if (diff !== 0n && !input.note) {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'BAD_REQUEST',
        'Farq mavjud boʻlganda izoh majburiy',
      );
    }

    const row = await this.db.transaction(async (tx: Transaction) => {
      const inserted = await this.repo.insertCashClosing(
        {
          branchId,
          date: input.date,
          expectedCash,
          countedCash,
          diff,
          closedBy: user.id,
          note: input.note ?? null,
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
    });

    return serializeCashClosing({ ...row, closedByName: null });
  }

  async getExpectedCash(dateStr: string): Promise<{ date: string; expectedCash: string }> {
    const branchId = '01900000-0000-7000-8000-000000000001';
    const total = await this.repo.sumCashPaymentsForDate(dateStr, branchId);
    return { date: dateStr, expectedCash: total.toString() };
  }

  async getCashClosings(query: CashClosingListQueryInput): Promise<CashClosing[]> {
    const branchId = '01900000-0000-7000-8000-000000000001';
    const rows = await this.repo.findCashClosings(query, branchId);
    return rows.map(serializeCashClosing);
  }
}
