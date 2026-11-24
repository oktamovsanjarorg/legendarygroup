import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import type { Transaction } from '@lg/db';
import { applyDiscounts, calculateMidMonthEnrollmentPrice, type Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { EventHandlers } from '../outbox/index.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { BillingGeneratorService, ledgerFor } from './billing-generator.service.js';
import { BillingRepository } from './billing.repository.js';
import type { ActiveEnrollmentInfo } from './billing.types.js';
import { openEnrollmentIds } from './group-billing.repository.js';
import type { PreparedLine } from './month-adjustments.js';

const monthEndOf = (period: string): string => {
  const [y, m] = period.split('-').map(Number) as [number, number];
  return `${period}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, '0')}`;
};

/** Shu oyda hisob yoziladigan a'zolik (to'xtatilgan guruh — yo'q, Q-102). */
const billable = (e: ActiveEnrollmentInfo, monthStart: string, monthEnd: string) =>
  e.groupStatus !== 'paused' &&
  e.startDate <= monthEnd &&
  (e.endDate === null || e.endDate >= monthStart);

/** Narx (chegirma bilan) × qolgan kunlar / oy kunlari, 1 000 ga pastga (BR-3 yaxlitlashi). */
function prorateFrom(
  line: PreparedLine,
  e: ActiveEnrollmentInfo,
  from: string,
  monthEnd: string,
): PreparedLine {
  const days = Number(monthEnd.slice(8));
  const left = days - Number(from.slice(8)) + 1;
  const full = calculateMidMonthEnrollmentPrice(e.monthlyPrice, left, days);
  const percent = e.discountPercent ?? 0;
  const amount = percent > 0 ? applyDiscounts(full, [{ type: 'percent', percent }]).netPrice : full;
  return { ...line, amount };
}

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
    // Q-102: to'xtatilgan guruh davom etdi — joriy oyda hisobi yo'q a'zolarga qolgan kunlar uchun.
    this.events.on('GroupResumed', 'billing.group-resumed', async (e, tx) => {
      for (const id of await openEnrollmentIds(tx, e.payload.groupId, e.payload.date))
        await this.billFirstMonth(tx, id, e.payload.date);
    });
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

  /** Davom ettirilgan guruh: qolgan kunlar ulushi va to'xtatishdan oldingi kredit (BR-5). */
  private async resumed(
    base: PreparedLine,
    e: ActiveEnrollmentInfo,
    m: { from: string; monthEnd: string; period: string },
  ): Promise<PreparedLine> {
    const line = m.from > e.startDate ? prorateFrom(base, e, m.from, m.monthEnd) : base;
    const [adjusted] = await this.generator.adjusted(e.studentId, m.period, [line]);
    return adjusted ?? line;
  }

  /** `from` — davom ettirilgan kun: oyning qolgan kunlariga mutanosib (oyda to'liq jadval yo'q). */
  async billFirstMonth(tx: Transaction, enrollmentId: string, from?: string): Promise<void> {
    const period = this.clock.today().slice(0, 7);
    const monthStart = `${period}-01`;
    const monthEnd = monthEndOf(period);
    const e = await this.repo.findEnrollmentInfo(tx, enrollmentId);
    // Kelajak oydan boshlanadi — o'sha oyning 1-sanasidagi generator yozadi.
    if (!e || !billable(e, monthStart, monthEnd)) return;
    await this.balance.lockStudent(tx, e.studentId);
    const base = await this.generator.calculateEnrollmentLine(e, monthStart, monthEnd, period);
    const line = from ? await this.resumed(base, e, { from, monthEnd, period }) : base;
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
