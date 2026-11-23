import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Database, NewInvoiceLineRow, NewLedgerEntryRow } from '@lg/db';
import { applyDiscounts, calculateMidMonthEnrollmentPrice } from '@lg/domain';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { BillingBalanceRepository } from './billing-balance.repository.js';
import { BillingRepository } from './billing.repository.js';
import type { ActiveEnrollmentInfo } from './billing.types.js';
import { type MonthAdjustment, MonthCloseService } from './month-close.service.js';

export interface GenerateResult {
  period: string;
  invoicesCreated: number;
  linesCreated: number;
  totalAmount: string;
}

export interface PreparedLine {
  enrollmentId: string;
  /** Qator summasi (o'qishda — kreditdan keyingi net). */
  amount: bigint;
  description: string;
  kind: 'tuition' | 'penalty';
  /** BR-5/9 kredit: ledger'da `invoice` (+brutto) va `credit` (−kredit) alohida. */
  credit?: bigint;
}

/** BR-2: o'tgan oy yopilishi tuzatishlarini yangi oy qatorlariga qo'llash (manfiy qator yo'q). */
export function applyAdjustments(
  lines: PreparedLine[],
  adj: readonly MonthAdjustment[],
): PreparedLine[] {
  const out = lines.map((l) => {
    const a = adj.find((x) => x.enrollmentId === l.enrollmentId);
    if (!a || a.credit <= 0n || l.kind !== 'tuition') return l;
    const credit = a.credit < l.amount ? a.credit : l.amount;
    return {
      ...l,
      amount: l.amount - credit,
      credit,
      description: `${l.description}; kredit −${credit} (${a.creditNote ?? ''})`,
    };
  });
  for (const a of adj) {
    if (a.penalty > 0n)
      out.push({
        enrollmentId: a.enrollmentId,
        amount: a.penalty,
        kind: 'penalty',
        description: `Jarima: ${a.penaltyNote ?? ''}`,
      });
  }
  return out;
}

/** Ledger: o'qish — `invoice` (+brutto) va kredit bo'lsa `credit` (−kredit); jarima — `penalty`. */
export function ledgerFor(
  studentId: string,
  lines: readonly PreparedLine[],
  inserted: readonly { id: string; amount: bigint; kind: string }[],
  occurredAt: Date,
): NewLedgerEntryRow[] {
  return inserted.flatMap((line, i) => {
    const credit = lines[i]?.credit ?? 0n;
    const at = { studentId, refTable: 'invoice_lines', refId: line.id, occurredAt };
    const entryType = line.kind === 'penalty' ? ('penalty' as const) : ('invoice' as const);
    const main = { ...at, entryType, amount: line.amount + credit };
    return credit > 0n ? [main, { ...at, entryType: 'credit' as const, amount: -credit }] : [main];
  });
}

@Injectable()
export class BillingGeneratorService {
  private readonly logger = new Logger(BillingGeneratorService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(BillingRepository) private readonly repo: BillingRepository,
    @Inject(BillingBalanceRepository) private readonly balance: BillingBalanceRepository,
    @Inject(MonthCloseService) private readonly monthClose: MonthCloseService,
  ) {}

  async generateMonthlyInvoices(period: string, customDueDate?: string): Promise<GenerateResult> {
    const { monthStart, monthEnd, defaultDueDate } = this.calculateMonthDates(period);
    const dueDate = customDueDate ?? defaultDueDate;

    const enrollmentsList = await this.repo.findActiveEnrollmentsForMonth(monthStart, monthEnd);
    const studentLinesMap = await this.prepareLinesByStudent(
      enrollmentsList,
      monthStart,
      monthEnd,
      period,
    );
    // BR-2 1-qadam: o'tgan oy yopiladi (kredit, jarima). Xato bo'lsa — 2-qadam (invoice) yo'q.
    for (const [studentId, lines] of studentLinesMap)
      studentLinesMap.set(
        studentId,
        applyAdjustments(lines, await this.monthClose.adjustments(studentId, period)),
      );

    return this.persistInvoices(period, dueDate, studentLinesMap);
  }

  /**
   * T-145: bitta o'quvchiga oy hisobi (boshlang'ich sozlashdan keyin, haqiqiy kelgan sana bilan —
   * BR-3). Bor bo'lsa — o'tkaziladi. Muddat o'tib ketgan bo'lsa — bugun.
   */
  async generateForStudent(studentId: string, period: string, today: string): Promise<void> {
    const { monthStart, monthEnd, defaultDueDate } = this.calculateMonthDates(period);
    const list = (await this.repo.findActiveEnrollmentsForMonth(monthStart, monthEnd)).filter(
      (e) => e.studentId === studentId,
    );
    const map = await this.prepareLinesByStudent(list, monthStart, monthEnd, period);
    for (const [id, lines] of map)
      map.set(id, applyAdjustments(lines, await this.monthClose.adjustments(id, period)));
    await this.persistInvoices(period, defaultDueDate < today ? today : defaultDueDate, map);
  }

  private calculateMonthDates(period: string) {
    const [yearStr, monthStr] = period.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const monthStart = `${period}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const monthEnd = `${period}-${String(lastDay).padStart(2, '0')}`;
    const defaultDueDate = `${period}-10`;
    return { monthStart, monthEnd, defaultDueDate };
  }

  private async prepareLinesByStudent(
    enrollmentsList: ActiveEnrollmentInfo[],
    monthStart: string,
    monthEnd: string,
    period: string,
  ): Promise<Map<string, PreparedLine[]>> {
    const studentLinesMap = new Map<string, PreparedLine[]>();

    for (const enrollment of enrollmentsList) {
      const line = await this.calculateEnrollmentLine(enrollment, monthStart, monthEnd, period);
      const existing = studentLinesMap.get(enrollment.studentId) ?? [];
      existing.push(line);
      studentLinesMap.set(enrollment.studentId, existing);
    }

    return studentLinesMap;
  }

  /** BR-3 (kelgan sana bo'yicha) va doimiy chegirma; Q-95 handler ham ishlatadi. */
  async calculateEnrollmentLine(
    enrollment: ActiveEnrollmentInfo,
    monthStart: string,
    monthEnd: string,
    period: string,
  ): Promise<PreparedLine> {
    let amount = enrollment.monthlyPrice;

    if (enrollment.startDate > monthStart) {
      const totalLessons = await this.repo.countPlannedLessons(
        enrollment.groupId,
        monthStart,
        monthEnd,
      );
      const remainingLessons = await this.repo.countPlannedLessons(
        enrollment.groupId,
        enrollment.startDate,
        monthEnd,
      );
      if (totalLessons > 0) {
        amount = calculateMidMonthEnrollmentPrice(
          enrollment.monthlyPrice,
          remainingLessons,
          totalLessons,
        );
      }
    }

    if (enrollment.discountPercent && enrollment.discountPercent > 0) {
      amount = applyDiscounts(amount, [
        { type: 'percent', percent: enrollment.discountPercent },
      ]).netPrice;
    }

    return {
      enrollmentId: enrollment.enrollmentId,
      amount,
      description: `${enrollment.groupName} kursi oylik to'lovi (${period})`,
      kind: 'tuition',
    };
  }

  private async persistInvoices(
    period: string,
    dueDate: string,
    studentLinesMap: Map<string, PreparedLine[]>,
  ): Promise<GenerateResult> {
    let invoicesCreated = 0;
    let linesCreated = 0;
    let totalAmount = 0n;

    await this.db.transaction(async (tx) => {
      for (const [studentId, lines] of studentLinesMap) {
        await this.balance.lockStudent(tx, studentId);
        const existing = await this.repo.findInvoiceByStudentAndPeriod(tx, studentId, period);
        if (existing) continue;

        const invoiceTotal = lines.reduce((acc, l) => acc + l.amount, 0n);
        const invoice = await this.repo.insertInvoice(tx, {
          studentId,
          period,
          dueDate,
          total: invoiceTotal,
          status: 'open',
        });

        const linesToInsert: NewInvoiceLineRow[] = lines.map((l) => ({
          invoiceId: invoice.id,
          enrollmentId: l.enrollmentId,
          kind: l.kind,
          amount: l.amount,
          description: l.description,
        }));

        const inserted = await this.repo.insertInvoiceLines(tx, linesToInsert);

        const ledgerToInsert = ledgerFor(studentId, lines, inserted, invoice.createdAt);

        await this.repo.insertLedgerEntries(tx, ledgerToInsert);
        // BR-12: oldindan to'langan avans yangi invoice'ga darhol qo'llanadi.
        await this.balance.applyAdvance(tx, studentId);
        await this.balance.refreshInvoiceStatuses(tx, studentId);

        invoicesCreated++;
        linesCreated += inserted.length;
        totalAmount += invoiceTotal;
      }
    });

    this.logger.log(
      `Invoicelar generatsiya qilindi: davr=${period}, soni=${invoicesCreated}, qatorlar=${linesCreated}, jami=${totalAmount}`,
    );

    return {
      period,
      invoicesCreated,
      linesCreated,
      totalAmount: totalAmount.toString(),
    };
  }
}
