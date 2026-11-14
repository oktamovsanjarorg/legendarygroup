import { Inject, Injectable } from '@nestjs/common';
import {
  type Database,
  enrollments,
  groups,
  guardians,
  invoiceOutstandingSql,
  invoices,
  ledgerEntries,
  type NewPaymentReminderRow,
  paymentReminders,
  payments,
  studentGuardians,
  students,
} from '@lg/db';
import { and, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface RawDebtorStudent {
  id: string;
  code: number;
  fullName: string;
  branchId: string;
  debt: bigint;
}

export interface DebtorGroupInfo {
  studentId: string;
  groupId: string;
  groupName: string;
  monthlyPrice: bigint;
}

export interface DebtorInvoiceInfo {
  studentId: string;
  invoiceId: string;
  dueDate: string;
  total: bigint;
}

@Injectable()
export class DebtorsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  /** Ledger bo'yicha qarzi (sum(amount) > 0) bor faol o'quvchilarni topadi. */
  async findStudentsWithPositiveLedger(branchId: string): Promise<RawDebtorStudent[]> {
    const rows = await this.db
      .select({
        id: students.id,
        code: students.code,
        fullName: students.fullName,
        branchId: students.branchId,
        debt: sql<bigint>`coalesce(sum(${ledgerEntries.amount}), 0)`,
      })
      .from(students)
      .innerJoin(ledgerEntries, eq(ledgerEntries.studentId, students.id))
      .where(and(eq(students.branchId, branchId), isNull(students.archivedAt)))
      .groupBy(students.id, students.code, students.fullName, students.branchId)
      .having(sql`sum(${ledgerEntries.amount}) > 0`);

    return rows.map((r) => ({
      id: r.id,
      code: Number(r.code),
      fullName: r.fullName,
      branchId: r.branchId,
      debt: BigInt(r.debt),
    }));
  }

  /** O'quvchilarning joriy faol guruhlari va kurs narxlarini oladi. */
  async findActiveGroupsForStudents(
    studentIds: string[],
    today: string,
  ): Promise<DebtorGroupInfo[]> {
    if (studentIds.length === 0) return [];

    const rows = await this.db
      .select({
        studentId: enrollments.studentId,
        groupId: groups.id,
        groupName: groups.name,
        monthlyPrice: groups.monthlyPrice,
      })
      .from(enrollments)
      .innerJoin(groups, eq(groups.id, enrollments.groupId))
      .where(
        and(
          inArray(enrollments.studentId, studentIds),
          lte(enrollments.startDate, today),
          or(isNull(enrollments.endDate), sql`${enrollments.endDate} >= ${today}`),
        ),
      );

    return rows.map((r) => ({
      studentId: r.studentId,
      groupId: r.groupId,
      groupName: r.groupName,
      monthlyPrice: BigInt(r.monthlyPrice),
    }));
  }

  /** Ochiq yoki to'liq to'lanmagan invoicelarni oladi. */
  async findOpenInvoicesForStudents(studentIds: string[]): Promise<DebtorInvoiceInfo[]> {
    if (studentIds.length === 0) return [];

    const rows = await this.db
      .select({
        studentId: invoices.studentId,
        invoiceId: invoices.id,
        dueDate: invoices.dueDate,
        total: invoices.total,
      })
      .from(invoices)
      .where(
        and(
          inArray(invoices.studentId, studentIds),
          inArray(invoices.status, ['open', 'partially_paid']),
        ),
      );

    return rows.map((r) => ({
      studentId: r.studentId,
      invoiceId: r.invoiceId,
      dueDate: r.dueDate,
      total: BigInt(r.total),
    }));
  }

  /** O'quvchilarning oxirgi to'lov sanasini oladi. */
  async findLastPaymentsForStudents(studentIds: string[]): Promise<Map<string, Date>> {
    const map = new Map<string, Date>();
    if (studentIds.length === 0) return map;

    const rows = await this.db
      .select({
        studentId: payments.studentId,
        lastPaid: sql<Date>`max(${payments.paidAt})`,
      })
      .from(payments)
      .where(and(inArray(payments.studentId, studentIds), sql`${payments.amount} > 0`))
      .groupBy(payments.studentId);

    for (const r of rows) {
      if (r.lastPaid) map.set(r.studentId, new Date(r.lastPaid));
    }
    return map;
  }

  /** O'quvchilarga yuborilgan eslatmalar sonini oladi. */
  async countRemindersForStudents(studentIds: string[]): Promise<Map<string, number>> {
    const map = new Map<string, number>();
    if (studentIds.length === 0) return map;

    const rows = await this.db
      .select({
        studentId: paymentReminders.studentId,
        cnt: sql<number>`count(${paymentReminders.id})::int`,
      })
      .from(paymentReminders)
      .where(inArray(paymentReminders.studentId, studentIds))
      .groupBy(paymentReminders.studentId);

    for (const r of rows) {
      map.set(r.studentId, r.cnt);
    }
    return map;
  }

  /** O'quvchining asosiy ota-onasini topadi. */
  async findPrimaryGuardian(studentId: string) {
    const [row] = await this.db
      .select({
        guardianId: guardians.id,
        userId: guardians.userId,
        phone: guardians.phone,
        fullName: guardians.fullName,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(and(eq(studentGuardians.studentId, studentId), eq(studentGuardians.isPrimary, true)));

    return row ?? null;
  }

  /** Eslatma yozuvini saqlaydi. */
  async createReminder(data: NewPaymentReminderRow) {
    const [row] = await this.db.insert(paymentReminders).values(data).returning();
    if (!row) throw new Error('FAILED_TO_CREATE_REMINDER');
    return row;
  }

  /** Invoice va tur bo'yicha eslatma yuborilganligini tekshiradi. */
  async hasReminderForInvoiceAndType(invoiceId: string, type: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: paymentReminders.id })
      .from(paymentReminders)
      .where(and(eq(paymentReminders.invoiceId, invoiceId), eq(paymentReminders.type, type)));
    return Boolean(row);
  }

  /** BR-21: Barcha ochiq invoicelarni oladi (avtomatik eslatmalar uchun). */
  async findAllOpenInvoicesWithDetails() {
    const rows = await this.db
      .select({
        invoiceId: invoices.id,
        studentId: invoices.studentId,
        studentName: students.fullName,
        branchId: invoices.branchId,
        period: invoices.period,
        dueDate: invoices.dueDate,
        outstanding: invoiceOutstandingSql(invoices.id, invoices.total),
      })
      .from(invoices)
      .innerJoin(students, eq(students.id, invoices.studentId))
      .where(and(inArray(invoices.status, ['open', 'partially_paid']), isNull(students.archivedAt)))
      .orderBy(desc(invoices.dueDate));
    return rows
      .map((r) => ({ ...r, outstanding: BigInt(r.outstanding) }))
      .filter((r) => r.outstanding > 0n);
  }
}
