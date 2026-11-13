import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { SetEnrollmentDiscountInput, WaivePenaltyInput } from '@lg/contracts';
import { type Database, type EnrollmentRow, type Transaction } from '@lg/db';
import { computeInvoiceTotal } from '@lg/domain';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { SettingsService } from '../settings/index.js';
import { DiscountsRepository } from './discounts.repository.js';

export interface WaivePenaltyParams {
  invoiceId: string;
  lineId: string;
  input: WaivePenaltyInput;
  ctx: AuditContext;
}

@Injectable()
export class DiscountsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(DiscountsRepository) private readonly repo: DiscountsRepository,
    @Inject(SettingsService) private readonly settings: SettingsService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async setEnrollmentDiscount(
    enrollmentId: string,
    input: SetEnrollmentDiscountInput,
    user: RequestUser,
    ctx: AuditContext,
  ): Promise<EnrollmentRow> {
    const enrollment = await this.repo.findEnrollmentById(enrollmentId);
    if (!enrollment) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Enrollment topilmadi');
    }

    const sysSettings = await this.settings.getSettings();
    const limit = sysSettings.adminDiscountLimitPercent;
    if (user.role !== 'director' && input.percent > limit) {
      throw new AppException(
        HttpStatus.FORBIDDEN,
        'FORBIDDEN',
        `Chegirma Admin limitidan (${limit}%) yuqori. Director tasdigʻi soʻrovi talab qilinadi`,
      );
    }

    return this.db.transaction(async (tx: Transaction) => {
      const updated = await this.repo.updateEnrollmentDiscount(enrollmentId, input.percent, tx);

      await this.audit.record(
        ctx,
        {
          action: 'billing.discount.set',
          entity: 'enrollment',
          entityId: enrollmentId,
          before: { discountPercent: enrollment.discountPercent },
          after: { discountPercent: input.percent, reason: input.reason },
        },
        tx,
      );

      if (!updated) {
        throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Enrollment topilmadi');
      }
      return updated;
    });
  }

  async waivePenalty(p: WaivePenaltyParams): Promise<{ invoiceId: string; newTotal: string }> {
    const invoice = await this.repo.findInvoiceById(p.invoiceId);
    const line = await this.repo.findInvoiceLineById(p.lineId);

    if (!invoice || !line || line.invoiceId !== p.invoiceId) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND', 'Jarima qatori topilmadi');
    }

    if (line.kind !== 'penalty') {
      throw new AppException(
        HttpStatus.BAD_REQUEST,
        'BAD_REQUEST',
        'Faqat jarima qatorini bekor qilish mumkin',
      );
    }

    return this.executeWaiveTx(invoice, line, p.input, p.ctx);
  }

  private async executeWaiveTx(
    invoice: { id: string; branchId: string; studentId: string },
    line: { id: string; amount: bigint },
    input: WaivePenaltyInput,
    ctx: AuditContext,
  ): Promise<{ invoiceId: string; newTotal: string }> {
    return this.db.transaction(async (tx: Transaction) => {
      await this.repo.deleteInvoiceLine(line.id, tx);
      const remaining = await this.repo.findInvoiceLines(invoice.id, tx);
      const newTotal = computeInvoiceTotal(remaining);
      await this.repo.updateInvoiceTotal(invoice.id, newTotal, tx);

      // Jarima bekor qilingani uchun qarz kamayadi (manfiy ledger yozuvi)
      await this.repo.insertLedgerEntry(
        {
          branchId: invoice.branchId,
          studentId: invoice.studentId,
          entryType: 'discount',
          amount: -line.amount,
          refTable: 'invoice_lines',
          refId: line.id,
        },
        tx,
      );

      await this.audit.record(
        ctx,
        {
          action: 'billing.penalty.waive',
          entity: 'invoice_line',
          entityId: line.id,
          before: { amount: line.amount.toString() },
          after: { reason: input.reason },
        },
        tx,
      );

      return { invoiceId: invoice.id, newTotal: newTotal.toString() };
    });
  }
}
