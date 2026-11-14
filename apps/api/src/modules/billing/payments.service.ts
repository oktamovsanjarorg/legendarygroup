import { randomBytes } from 'node:crypto';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  CreatePaymentInput,
  PaymentDetail,
  PaymentListQueryInput,
  PublicReceipt,
} from '@lg/contracts';
import type { Database, PaymentRow, Transaction } from '@lg/db';
import { allocateFifo, type Clock } from '@lg/domain';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { StudentScopeService } from '../students/index.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { BillingRepository } from './billing.repository.js';
import { receiptYear } from './receipt-year.js';

interface PaymentTxParams {
  input: CreatePaymentInput;
  userId: string;
  amount: bigint;
  paidAt: Date;
}

interface PaymentTxResult {
  payment: PaymentRow;
  receiptNumber: string;
  allocs: { paymentId: string; invoiceLineId: string; amount: bigint }[];
  advance: bigint;
}

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(BillingRepository) private readonly repo: BillingRepository,
    @Inject(BillingBalanceRepository) private readonly balance: BillingBalanceRepository,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async createPayment(
    ctx: AuditContext,
    user: RequestUser,
    input: CreatePaymentInput,
  ): Promise<PaymentDetail> {
    await this.studentScope.assertVisible(user, input.studentId);
    const amount = BigInt(input.amount);
    const paidAt = input.paidAt ? new Date(input.paidAt) : this.clock.now();

    const { payment, receiptNumber, allocs, advance } = await this.db.transaction((tx) =>
      this.executePaymentTx(tx, { input, userId: user.id, amount, paidAt }),
    );

    await this.audit.record(ctx, {
      action: 'payment.create',
      entity: 'payment',
      entityId: payment.id,
      after: {
        amount: input.amount,
        method: input.method,
        receiptNumber,
        allocationsCount: allocs.length,
      },
    });

    return {
      id: payment.id,
      branchId: payment.branchId,
      studentId: payment.studentId,
      amount: payment.amount.toString(),
      method: payment.method,
      paidAt: payment.paidAt.toISOString(),
      receivedBy: payment.receivedBy,
      receiptNumber,
      allocations: allocs.map((a) => ({
        invoiceLineId: a.invoiceLineId,
        amount: a.amount.toString(),
      })),
      advance: advance.toString(),
      createdAt: payment.createdAt.toISOString(),
    };
  }

  private async executePaymentTx(tx: Transaction, p: PaymentTxParams): Promise<PaymentTxResult> {
    await this.balance.lockStudent(tx, p.input.studentId);
    const openLines = await this.balance.openLines(tx, p.input.studentId);
    const allocation = allocateFifo(
      p.amount,
      openLines.map((l) => ({ id: l.id, dueDate: l.dueDate, outstanding: l.outstanding })),
    );

    const paymentRow = await this.repo.insertPayment(tx, {
      studentId: p.input.studentId,
      amount: p.amount,
      method: p.input.method,
      paidAt: p.paidAt,
      receivedBy: p.userId,
      submissionId: p.input.submissionId,
    });

    const allocs = allocation.parts.map((part) => ({
      paymentId: paymentRow.id,
      invoiceLineId: part.id,
      amount: part.amount,
    }));
    await this.repo.insertPaymentAllocations(tx, allocs);
    await this.balance.refreshInvoiceStatuses(tx, p.input.studentId);

    await this.repo.insertLedgerEntries(tx, [
      {
        studentId: p.input.studentId,
        entryType: 'payment',
        amount: -p.amount,
        refTable: 'payments',
        refId: paymentRow.id,
        occurredAt: p.paidAt,
      },
    ]);

    const year = receiptYear(p.paidAt);
    const num = await this.repo.getNextReceiptNumber(tx, year);
    const verifyToken = randomBytes(16).toString('hex');
    await this.repo.insertReceipt(tx, { number: num, paymentId: paymentRow.id, verifyToken });

    return { payment: paymentRow, receiptNumber: num, allocs, advance: allocation.advance };
  }

  async getPayments(user: RequestUser, query: PaymentListQueryInput): Promise<PaymentDetail[]> {
    if (query.studentId) {
      await this.studentScope.assertVisible(user, query.studentId);
    }

    const rows = await this.repo.findPayments(query);
    const result: PaymentDetail[] = [];

    for (const row of rows) {
      const receipt = await this.repo.findReceiptByPaymentId(row.id);
      const allocs = await this.repo.findAllocationsByPaymentId(row.id);
      result.push({
        id: row.id,
        branchId: row.branchId,
        studentId: row.studentId,
        amount: row.amount.toString(),
        method: row.method,
        paidAt: row.paidAt.toISOString(),
        receivedBy: row.receivedBy,
        receiptNumber: receipt?.number ?? null,
        allocations: allocs.map((a) => ({
          invoiceLineId: a.invoiceLineId,
          amount: a.amount.toString(),
        })),
        advance: '0',
        createdAt: row.createdAt.toISOString(),
      });
    }

    return result;
  }

  async getPaymentById(user: RequestUser, id: string): Promise<PaymentDetail> {
    const payment = await this.repo.findPaymentById(id);
    if (!payment) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    await this.studentScope.assertVisible(user, payment.studentId);
    const receipt = await this.repo.findReceiptByPaymentId(payment.id);
    const allocs = await this.repo.findAllocationsByPaymentId(payment.id);

    return {
      id: payment.id,
      branchId: payment.branchId,
      studentId: payment.studentId,
      amount: payment.amount.toString(),
      method: payment.method,
      paidAt: payment.paidAt.toISOString(),
      receivedBy: payment.receivedBy,
      receiptNumber: receipt?.number ?? null,
      allocations: allocs.map((a) => ({
        invoiceLineId: a.invoiceLineId,
        amount: a.amount.toString(),
      })),
      advance: '0',
      createdAt: payment.createdAt.toISOString(),
    };
  }

  async getPublicReceipt(number: string): Promise<PublicReceipt> {
    const receipt = await this.repo.findReceiptByNumber(number);
    if (!receipt) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const payment = await this.repo.findPaymentById(receipt.paymentId);
    if (!payment) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    const status = await this.repo.isReceiptCancelled(receipt.id);

    return {
      number: receipt.number,
      amount: payment.amount.toString(),
      paidAt: payment.paidAt.toISOString(),
      method: payment.method,
      isCancelled: status.isCancelled,
      cancelReason: status.reason,
    };
  }
}
