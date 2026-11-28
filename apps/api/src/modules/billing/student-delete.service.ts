import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  invoices,
  ledgerEntries,
  paymentReminders,
  payments,
  paymentSubmissions,
  type Transaction,
} from '@lg/db';
import { eq, sql } from 'drizzle-orm';
import { type AuditContext } from '../../common/audit/audit.service.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { StudentPurgeService } from '../students/index.js';

/**
 * Q-124: arxivdagi o'quvchini butunlay o'chirish. Pul tarixi (hisob, to'lov, ledger, chek
 * so'rovi, eslatma) bo'lsa — 409: ledger o'zgarmaydi (CLAUDE.md), hisobotlar buzilmasin; bunday
 * o'quvchi arxivda qoladi. Pul jadvallari — billing'niki, shuning uchun tekshiruv shu yerda.
 */
@Injectable()
export class StudentDeleteService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(StudentPurgeService) private readonly purge: StudentPurgeService,
  ) {}

  async remove(ctx: AuditContext, studentId: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      // Qulf: shu paytda to'lov kiritilsa — u kutadi, keyin o'quvchini topmaydi.
      await this.purge.lockArchived(tx, studentId);
      if (await this.hasFinance(tx, studentId))
        throw new AppException(HttpStatus.CONFLICT, 'STUDENT_HAS_FINANCE');
      await this.purge.purge(ctx, studentId, tx);
    });
  }

  private async hasFinance(tx: Transaction, studentId: string): Promise<boolean> {
    const one = { one: sql<number>`1` };
    const checks = [
      tx.select(one).from(invoices).where(eq(invoices.studentId, studentId)).limit(1),
      tx.select(one).from(payments).where(eq(payments.studentId, studentId)).limit(1),
      tx.select(one).from(ledgerEntries).where(eq(ledgerEntries.studentId, studentId)).limit(1),
      tx
        .select(one)
        .from(paymentSubmissions)
        .where(eq(paymentSubmissions.studentId, studentId))
        .limit(1),
      tx
        .select(one)
        .from(paymentReminders)
        .where(eq(paymentReminders.studentId, studentId))
        .limit(1),
    ];
    for (const q of checks) if ((await q).length > 0) return true;
    return false;
  }
}
