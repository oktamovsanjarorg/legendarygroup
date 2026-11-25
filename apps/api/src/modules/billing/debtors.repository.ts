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
  users,
} from '@lg/db';
import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export interface RawDebtorStudent {
  id: string;
  code: number;
  fullName: string;
  branchId: string;
  debt: bigint;
  archived: boolean;
}

export interface DebtorGroupInfo {
  studentId: string;
  groupId: string;
  groupName: string;
  monthlyPrice: bigint;
}

export interface DebtorGuardian {
  guardianId: string;
  userId: string | null;
  phone: string;
  fullName: string;
  linked: boolean;
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

  /**
   * Ledger bo'yicha qarzi (sum(amount) > 0) bor o'quvchilar. Arxivdagilar — faqat `withArchived`
   * (T-165: arxivlash qarzni yo'q qilmaydi — ro'yxat va jami summada; eslatma/e'londa — yo'q).
   */
  async findStudentsWithPositiveLedger(
    branchId: string,
    withArchived = false,
  ): Promise<RawDebtorStudent[]> {
    const rows = await this.db
      .select({
        id: students.id,
        code: students.code,
        fullName: students.fullName,
        branchId: students.branchId,
        archivedAt: students.archivedAt,
        debt: sql<bigint>`coalesce(sum(${ledgerEntries.amount}), 0)`,
      })
      .from(students)
      .innerJoin(ledgerEntries, eq(ledgerEntries.studentId, students.id))
      .where(
        and(
          eq(students.branchId, branchId),
          withArchived ? undefined : isNull(students.archivedAt),
        ),
      )
      .groupBy(students.id, students.code, students.fullName, students.branchId)
      .having(sql`sum(${ledgerEntries.amount}) > 0`);

    return rows.map((r) => ({
      id: r.id,
      code: Number(r.code),
      fullName: r.fullName,
      branchId: r.branchId,
      debt: BigInt(r.debt),
      archived: r.archivedAt !== null,
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
          // BR-20: faqat haqiqatan to'lanmagan qoldiq kechikish sanaladi
          sql`${invoiceOutstandingSql(invoices.id, invoices.total)} > 0`,
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
        // Bir xabar bir nechta oyni qamrasa — bir yuborish (bir xil sent_at)
        cnt: sql<number>`count(distinct ${paymentReminders.sentAt})::int`,
      })
      .from(paymentReminders)
      .where(inArray(paymentReminders.studentId, studentIds))
      .groupBy(paymentReminders.studentId);

    for (const r of rows) {
      map.set(r.studentId, r.cnt);
    }
    return map;
  }

  /** O'quvchilarning ota-onalari: avval asosiysi; `linked` — Telegram ulangan. */
  async findGuardians(studentIds: string[]): Promise<Map<string, DebtorGuardian[]>> {
    const map = new Map<string, DebtorGuardian[]>();
    if (studentIds.length === 0) return map;
    const rows = await this.db
      .select({
        studentId: studentGuardians.studentId,
        guardianId: guardians.id,
        userId: guardians.userId,
        phone: guardians.phone,
        fullName: guardians.fullName,
        linked: sql<boolean>`${users.telegramId} is not null`,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .leftJoin(users, eq(users.id, guardians.userId))
      .where(inArray(studentGuardians.studentId, studentIds))
      .orderBy(desc(studentGuardians.isPrimary), guardians.id);
    for (const r of rows) map.set(r.studentId, [...(map.get(r.studentId) ?? []), r]);
    return map;
  }

  /** Shu paytdan beri qo'lda eslatma yuborilgan o'quvchilar. */
  async findManuallyReminded(studentIds: string[], since: Date): Promise<Set<string>> {
    if (studentIds.length === 0) return new Set();
    const rows = await this.db
      .select({ studentId: paymentReminders.studentId })
      .from(paymentReminders)
      .where(
        and(
          inArray(paymentReminders.studentId, studentIds),
          eq(paymentReminders.type, 'manual'),
          gte(paymentReminders.sentAt, since),
        ),
      );
    return new Set(rows.map((r) => r.studentId));
  }

  /** Eslatma yozuvini saqlaydi. */
  async createReminders(rows: NewPaymentReminderRow[]): Promise<void> {
    if (rows.length > 0) await this.db.insert(paymentReminders).values(rows);
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
