import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type {
  GenerateInvoicesInput,
  Invoice,
  InvoiceListQueryInput,
  InvoiceWithLines,
  LedgerEntry,
  LedgerListQueryInput,
  StudentLedgerSummary,
} from '@lg/contracts';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { StudentScopeService } from '../students/index.js';
import { BillingGeneratorService, type GenerateResult } from './billing-generator.service.js';
import { BillingRepository } from './billing.repository.js';
import {
  serializeInvoice,
  serializeLedgerEntry,
  serializeStudentLedgerSummary,
} from './billing.serializer.js';

@Injectable()
export class BillingService {
  constructor(
    @Inject(BillingRepository) private readonly repo: BillingRepository,
    @Inject(BillingGeneratorService) private readonly generator: BillingGeneratorService,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getInvoices(user: RequestUser, query: InvoiceListQueryInput): Promise<Invoice[]> {
    if (query.studentId) {
      await this.studentScope.assertVisible(user, query.studentId);
    }

    const rows = await this.repo.findInvoices(query);
    return rows.map((r) => serializeInvoice(r) as Invoice);
  }

  async getInvoiceById(user: RequestUser, id: string): Promise<InvoiceWithLines> {
    const row = await this.repo.findInvoiceById(id);
    if (!row) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');

    await this.studentScope.assertVisible(user, row.studentId);
    const lines = await this.repo.findInvoiceLines(id);

    return serializeInvoice(row, lines) as InvoiceWithLines;
  }

  async getStudentLedger(
    user: RequestUser,
    studentId: string,
    query: LedgerListQueryInput,
  ): Promise<LedgerEntry[]> {
    await this.studentScope.assertVisible(user, studentId);
    const rows = await this.repo.findStudentLedger(studentId, query);
    return rows.map(serializeLedgerEntry);
  }

  async getStudentLedgerSummary(
    user: RequestUser,
    studentId: string,
  ): Promise<StudentLedgerSummary> {
    await this.studentScope.assertVisible(user, studentId);
    const total = await this.repo.calculateStudentLedgerTotal(studentId);
    return serializeStudentLedgerSummary(studentId, total);
  }

  async generateInvoices(ctx: AuditContext, input: GenerateInvoicesInput): Promise<GenerateResult> {
    const result = await this.generator.generateMonthlyInvoices(input.period, input.dueDate);

    await this.audit.record(ctx, {
      action: 'billing.invoices_generate',
      entity: 'billing',
      entityId: input.period,
      after: {
        period: result.period,
        invoicesCreated: result.invoicesCreated,
        linesCreated: result.linesCreated,
        totalAmount: result.totalAmount,
      },
    });

    return result;
  }
}
