import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  enrollments,
  invoiceLines,
  invoices,
  lineAllocatedSql,
  type Transaction,
} from '@lg/db';
import { computeInvoiceTotal } from '@lg/domain';
import { and, eq, gt } from 'drizzle-orm';
import { type AuditContext } from '../../common/audit/audit.service.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { EnrollmentsService } from '../students/index.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { DiscountsRepository } from './discounts.repository.js';

/**
 * Q-96: xato yozilgan a'zolikni butunlay olib tashlash (noto'g'ri guruh/o'quvchi). Shart — uning
 * hisob qatorlariga to'lov tegmagan. Qatorlar 0 (ledger'da teskari yozuv), a'zolik o'chiriladi.
 * To'lov tegsa — avval to'lovni bekor qilish (storno), keyin bu.
 */
@Injectable()
export class EnrollmentRemoveService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(EnrollmentsService) private readonly enrollments: EnrollmentsService,
    @Inject(BillingBalanceRepository) private readonly balance: BillingBalanceRepository,
    @Inject(DiscountsRepository) private readonly repo: DiscountsRepository,
  ) {}

  async remove(ctx: AuditContext, enrollmentId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [e] = await tx
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(eq(enrollments.id, enrollmentId));
      if (!e) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      await this.balance.lockStudent(tx, e.studentId);
      const lines = await this.linesOf(tx, enrollmentId);
      if (lines.some((l) => BigInt(l.allocated) > 0n))
        throw new AppException(HttpStatus.CONFLICT, 'ENROLLMENT_HAS_PAYMENTS');
      for (const l of lines) await this.zeroLine(tx, e.studentId, l);
      await this.enrollments.removeMistaken(ctx, enrollmentId, tx);
      await this.balance.applyAdvance(tx, e.studentId);
      await this.balance.refreshInvoiceStatuses(tx, e.studentId);
    });
  }

  private linesOf(tx: Transaction, enrollmentId: string) {
    return tx
      .select({
        id: invoiceLines.id,
        invoiceId: invoiceLines.invoiceId,
        amount: invoiceLines.amount,
        branchId: invoices.branchId,
        allocated: lineAllocatedSql(invoiceLines.id),
      })
      .from(invoiceLines)
      .innerJoin(invoices, eq(invoices.id, invoiceLines.invoiceId))
      .where(and(eq(invoiceLines.enrollmentId, enrollmentId), gt(invoiceLines.amount, 0n)));
  }

  private async zeroLine(
    tx: Transaction,
    studentId: string,
    l: { id: string; invoiceId: string; amount: bigint; branchId: string },
  ): Promise<void> {
    await this.repo.setInvoiceLineAmount(l.id, 0n, tx);
    const total = computeInvoiceTotal(await this.repo.findInvoiceLines(l.invoiceId, tx));
    await this.repo.updateInvoiceTotal(l.invoiceId, total, tx);
    // Bo'sh qolgan hisob — bekor (BR-6: qarz ko'rinmaydi, "to'langan" ham emas).
    if (total === 0n)
      await tx.update(invoices).set({ status: 'void' }).where(eq(invoices.id, l.invoiceId));
    await this.repo.insertLedgerEntry(
      {
        branchId: l.branchId,
        studentId,
        entryType: 'discount',
        amount: -l.amount,
        refTable: 'invoice_lines',
        refId: l.id,
      },
      tx,
    );
  }
}
