import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { StudentBillingSetupInput, StudentBillingSetupState } from '@lg/contracts';
import { type Database, enrollments, type Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { eq } from 'drizzle-orm';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { EnrollmentsService } from '../students/index.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { BillingGeneratorService, ledgerFor } from './billing-generator.service.js';
import { BillingRepository } from './billing.repository.js';

type Debt = StudentBillingSetupInput['openingDebts'][number];

/**
 * T-145 Boshlang'ich holat: tizimga o'tishda o'quvchi kartochkasidan — haqiqiy kelgan sana va
 * tizimdan oldingi to'lanmagan oylar; so'ng joriy oy hisobi (BR-3 — kelgan sana bo'yicha).
 * To'lov keyin oddiy yo'l bilan: FIFO (BR-12) — avval eng eski qarz.
 */
@Injectable()
export class StudentBillingSetupService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(BillingRepository) private readonly repo: BillingRepository,
    @Inject(BillingBalanceRepository) private readonly balance: BillingBalanceRepository,
    @Inject(BillingGeneratorService) private readonly generator: BillingGeneratorService,
    @Inject(EnrollmentsService) private readonly enrollments: EnrollmentsService,
  ) {}

  async state(studentId: string): Promise<StudentBillingSetupState> {
    const period = this.clock.today().slice(0, 7);
    const inv = await this.repo.findInvoiceByStudentAndPeriod(this.db, studentId, period);
    return { done: inv !== undefined && inv !== null, period };
  }

  async setup(
    ctx: AuditContext,
    studentId: string,
    input: StudentBillingSetupInput,
  ): Promise<StudentBillingSetupState> {
    const today = this.clock.today();
    const period = today.slice(0, 7);
    await this.db.transaction(async (tx) => {
      await this.balance.lockStudent(tx, studentId);
      if (await this.repo.findInvoiceByStudentAndPeriod(tx, studentId, period))
        throw new AppException(HttpStatus.CONFLICT, 'BILLING_ALREADY_SET');
      const own = new Set(
        (
          await tx
            .select({ id: enrollments.id })
            .from(enrollments)
            .where(eq(enrollments.studentId, studentId))
        ).map((r) => r.id),
      );
      const ids = [...input.enrollments, ...input.openingDebts].map((x) => x.enrollmentId);
      if (ids.some((id) => !own.has(id))) throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
      if (input.openingDebts.some((d) => d.period >= period))
        throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'period' });
      for (const e of input.enrollments)
        await this.enrollments.correctStartDate(ctx, e.enrollmentId, e.startDate, tx);
      await this.openingInvoices(ctx, tx, studentId, input.openingDebts);
    });
    await this.generator.generateForStudent(studentId, period, today);
    return this.state(studentId);
  }

  /** Oy bo'yicha bitta invoice (student+period noyob); ledger — `invoice` yozuvlari. */
  private async openingInvoices(
    ctx: AuditContext,
    tx: Transaction,
    studentId: string,
    debts: readonly Debt[],
  ) {
    const byPeriod = new Map<string, Debt[]>();
    for (const d of debts) byPeriod.set(d.period, [...(byPeriod.get(d.period) ?? []), d]);
    for (const [period, items] of byPeriod) {
      if (await this.repo.findInvoiceByStudentAndPeriod(tx, studentId, period)) continue;
      const lines = items.map((d) => ({
        enrollmentId: d.enrollmentId,
        amount: BigInt(d.amount),
        kind: 'tuition' as const,
        description: `Tizimdan oldingi qarz (${period})`,
      }));
      const total = lines.reduce((a, l) => a + l.amount, 0n);
      const invoice = await this.repo.insertInvoice(tx, {
        studentId,
        period,
        dueDate: `${period}-10`,
        total,
        status: 'open',
      });
      const inserted = await this.repo.insertInvoiceLines(
        tx,
        lines.map((l) => ({ ...l, invoiceId: invoice.id })),
      );
      await this.repo.insertLedgerEntries(
        tx,
        ledgerFor(studentId, lines, inserted, invoice.createdAt),
      );
      await this.audit.record(
        ctx,
        {
          action: 'billing.opening_debt',
          entity: 'invoice',
          entityId: invoice.id,
          after: { studentId, period, total: total.toString() },
        },
        tx,
      );
    }
    await this.balance.applyAdvance(tx, studentId);
    await this.balance.refreshInvoiceStatuses(tx, studentId);
  }
}
