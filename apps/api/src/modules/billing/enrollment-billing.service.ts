import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { EventHandlers } from '../outbox/index.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { BillingGeneratorService, ledgerFor } from './billing-generator.service.js';
import { BillingRepository } from './billing.repository.js';

const monthEndOf = (period: string): string => {
  const [y, m] = period.split('-').map(Number) as [number, number];
  return `${period}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

/**
 * Q-95: guruhga yozilganda joriy oy qatori darhol (BR-3 — kelgan sana bo'yicha, BR-6 — har guruh
 * alohida qator). Ilgari faqat 1-sanadagi generator yozardi — oy o'rtasida kelganning birinchi oyi
 * hisobsiz qolardi. Idempotent: qator bor bo'lsa — o'tkaziladi.
 */
@Injectable()
export class EnrollmentBillingService implements OnModuleInit {
  constructor(
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(EventHandlers) private readonly events: EventHandlers,
    @Inject(BillingRepository) private readonly repo: BillingRepository,
    @Inject(BillingBalanceRepository) private readonly balance: BillingBalanceRepository,
    @Inject(BillingGeneratorService) private readonly generator: BillingGeneratorService,
  ) {}

  onModuleInit(): void {
    this.events.on('EnrollmentCreated', 'billing.first-month', (e, tx) =>
      this.billFirstMonth(tx, e.payload.enrollmentId),
    );
  }

  /**
   * T-145 sozlash: kelgan sana tuzatilgandan keyin joriy oy qatorini qayta hisoblash (to'lov
   * hali yo'q — chaqiruvchi tekshiradi). Qator yo'q bo'lsa — yoziladi.
   */
  async rebill(tx: Transaction, enrollmentId: string): Promise<void> {
    const period = this.clock.today().slice(0, 7);
    const e = await this.repo.findEnrollmentInfo(tx, enrollmentId);
    const invoice = e && (await this.repo.findInvoiceByStudentAndPeriod(tx, e.studentId, period));
    const old = invoice && (await this.repo.findEnrollmentLine(tx, invoice.id, enrollmentId));
    if (!e || !invoice || !old) return this.billFirstMonth(tx, enrollmentId);
    const line = await this.generator.calculateEnrollmentLine(
      e,
      `${period}-01`,
      monthEndOf(period),
      period,
    );
    const diff = line.amount - old.amount;
    if (diff === 0n) return;
    await this.repo.setLineAmount(tx, old.id, line.amount, line.description);
    await this.repo.addToInvoiceTotal(tx, invoice.id, diff);
    await this.repo.insertLedgerEntries(tx, [
      {
        studentId: e.studentId,
        entryType: diff > 0n ? 'invoice' : 'discount',
        amount: diff,
        refTable: 'invoice_lines',
        refId: old.id,
        occurredAt: this.clock.now(),
      },
    ]);
  }

  async billFirstMonth(tx: Transaction, enrollmentId: string): Promise<void> {
    const period = this.clock.today().slice(0, 7);
    const monthStart = `${period}-01`;
    const monthEnd = monthEndOf(period);
    const e = await this.repo.findEnrollmentInfo(tx, enrollmentId);
    // Kelajak oydan boshlanadi — o'sha oyning 1-sanasidagi generator yozadi.
    if (!e || e.startDate > monthEnd || (e.endDate !== null && e.endDate < monthStart)) return;
    await this.balance.lockStudent(tx, e.studentId);
    const line = await this.generator.calculateEnrollmentLine(e, monthStart, monthEnd, period);
    if (line.amount <= 0n) return;
    let invoice = await this.repo.findInvoiceByStudentAndPeriod(tx, e.studentId, period);
    if (invoice && (await this.repo.findEnrollmentLine(tx, invoice.id, enrollmentId))) return;
    if (invoice) await this.repo.addToInvoiceTotal(tx, invoice.id, line.amount);
    else {
      const due = `${period}-10`;
      invoice = await this.repo.insertInvoice(tx, {
        studentId: e.studentId,
        period,
        dueDate: due < this.clock.today() ? this.clock.today() : due,
        total: line.amount,
        status: 'open',
      });
    }
    const inserted = await this.repo.insertInvoiceLines(tx, [
      {
        invoiceId: invoice.id,
        enrollmentId,
        kind: line.kind,
        amount: line.amount,
        description: line.description,
      },
    ]);
    await this.repo.insertLedgerEntries(
      tx,
      ledgerFor(e.studentId, [line], inserted, this.clock.now()),
    );
    await this.balance.applyAdvance(tx, e.studentId);
    await this.balance.refreshInvoiceStatuses(tx, e.studentId);
  }
}
