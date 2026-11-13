import { HttpStatus, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import type {
  DebtorBucket,
  DebtorItem,
  DebtorListQueryInput,
  DebtorListResponse,
  SendReminderResponse,
} from '@lg/contracts';
import { type Clock, isDebtCritical } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { StudentScopeService } from '../students/index.js';
import { TelegramOutbox } from '../telegram/index.js';
import {
  type DebtorGroupInfo,
  type DebtorInvoiceInfo,
  DebtorsRepository,
  type RawDebtorStudent,
} from './debtors.repository.js';

function diffInDays(dateA: string, dateB: string): number {
  const msA = Date.parse(`${dateA}T00:00:00Z`);
  const msB = Date.parse(`${dateB}T00:00:00Z`);
  return Math.round((msA - msB) / 86400000);
}

function matchBucket(bucket: DebtorBucket, days: number): boolean {
  if (bucket === 'all') return true;
  if (bucket === 'd0_7') return days >= 0 && days <= 7;
  if (bucket === 'd8_30') return days >= 8 && days <= 30;
  if (bucket === 'd30') return days > 30;
  return true;
}

function matchesFilters(
  item: DebtorItem,
  query: DebtorListQueryInput,
  studentGroups: DebtorGroupInfo[],
): boolean {
  if (!matchBucket(query.bucket, item.overdueDays)) return false;
  if (query.criticalOnly && !item.critical) return false;
  if (query.groupId && !studentGroups.some((g) => g.groupId === query.groupId)) return false;
  if (query.search) {
    const q = query.search.toLowerCase();
    if (!item.name.toLowerCase().includes(q) && !item.code.toLowerCase().includes(q)) {
      return false;
    }
  }
  return true;
}

@Injectable()
export class DebtorsService {
  private readonly logger = new Logger(DebtorsService.name);

  constructor(
    @Inject(DebtorsRepository) private readonly repo: DebtorsRepository,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Optional() @Inject(TelegramOutbox) private readonly telegramOutbox?: TelegramOutbox,
  ) {}

  /** Barcha qarzdorlarni yig'adi va filtrlarni qo'llaydi. */
  private async buildDebtorItems(
    branchId: string,
    query: DebtorListQueryInput,
  ): Promise<DebtorItem[]> {
    const today = this.clock.today();
    const students = await this.repo.findStudentsWithPositiveLedger(branchId);
    if (students.length === 0) return [];

    const studentIds = students.map((s) => s.id);
    const [groups, invoices, lastPayments, reminderCounts] = await Promise.all([
      this.repo.findActiveGroupsForStudents(studentIds, today),
      this.repo.findOpenInvoicesForStudents(studentIds),
      this.repo.findLastPaymentsForStudents(studentIds),
      this.repo.countRemindersForStudents(studentIds),
    ]);

    const groupMap = this.groupByStudent(groups);
    const invoiceMap = this.invoicesByStudent(invoices);

    const items: DebtorItem[] = [];
    for (const s of students) {
      const studentGroups = groupMap.get(s.id) ?? [];
      const item = this.buildSingleDebtorItem({
        student: s,
        today,
        groups: studentGroups,
        invoices: invoiceMap.get(s.id) ?? [],
        lastPayment: lastPayments.get(s.id),
        reminders: reminderCounts.get(s.id) ?? 0,
      });

      if (matchesFilters(item, query, studentGroups)) {
        items.push(item);
      }
    }

    return items.sort(
      (a, b) => b.overdueDays - a.overdueDays || Number(BigInt(b.debt) - BigInt(a.debt)),
    );
  }

  private groupByStudent(groups: DebtorGroupInfo[]): Map<string, DebtorGroupInfo[]> {
    const map = new Map<string, DebtorGroupInfo[]>();
    for (const g of groups) {
      const list = map.get(g.studentId) ?? [];
      list.push(g);
      map.set(g.studentId, list);
    }
    return map;
  }

  private invoicesByStudent(invoices: DebtorInvoiceInfo[]): Map<string, DebtorInvoiceInfo[]> {
    const map = new Map<string, DebtorInvoiceInfo[]>();
    for (const inv of invoices) {
      const list = map.get(inv.studentId) ?? [];
      list.push(inv);
      map.set(inv.studentId, list);
    }
    return map;
  }

  private buildSingleDebtorItem(params: {
    student: RawDebtorStudent;
    today: string;
    groups: DebtorGroupInfo[];
    invoices: DebtorInvoiceInfo[];
    lastPayment?: Date;
    reminders: number;
  }): DebtorItem {
    const { student, today, groups, invoices, lastPayment, reminders } = params;

    let overdueDays = 0;
    const firstInvoice = invoices[0];
    if (firstInvoice) {
      const oldestDueDate = invoices.reduce(
        (min, inv) => (inv.dueDate < min ? inv.dueDate : min),
        firstInvoice.dueDate,
      );
      if (oldestDueDate < today) {
        overdueDays = diffInDays(today, oldestDueDate);
      }
    }

    let monthlyPrice = groups.reduce((sum, g) => sum + g.monthlyPrice, 0n);
    if (monthlyPrice === 0n && firstInvoice) {
      monthlyPrice = firstInvoice.total;
    }

    const critical = isDebtCritical({ debt: student.debt, monthlyPrice, overdueDays });

    return {
      id: student.id,
      name: student.fullName,
      code: `LG-${student.code}`,
      group: groups.map((g) => g.groupName).join(', ') || '—',
      debt: student.debt.toString(),
      overdueDays,
      lastPayment: lastPayment ? lastPayment.toISOString() : null,
      reminders,
      critical,
    };
  }

  /** W-15 Qarzdorlar ro'yxati (aging, saralash, filtr). */
  async getDebtors(user: RequestUser, query: DebtorListQueryInput): Promise<DebtorListResponse> {
    const branchId = '01900000-0000-7000-8000-000000000001';
    const all = await this.buildDebtorItems(branchId, query);

    const totalDebt = all.reduce((sum, d) => sum + BigInt(d.debt), 0n).toString();
    const limit = query.limit ?? 50;
    const startIndex = query.cursor ? Number.parseInt(query.cursor, 10) : 0;
    const items = all.slice(startIndex, startIndex + limit);
    const nextIndex = startIndex + limit;
    const nextCursor = nextIndex < all.length ? String(nextIndex) : null;

    return { items, totalDebt, nextCursor };
  }

  /** W-15 Qarzdorlar ro'yxatini CSV ko'rinishida eksport qilish. */
  async exportDebtorsCsv(user: RequestUser, query: DebtorListQueryInput): Promise<string> {
    const branchId = '01900000-0000-7000-8000-000000000001';
    const all = await this.buildDebtorItems(branchId, query);

    const headers = [
      'Oʻquvchi',
      'Kod',
      'Guruh',
      'Qarz (soʻm)',
      'Kechikish (kun)',
      'Oxirgi toʻlov',
      'Eslatmalar',
      'Holat',
    ];
    const rows = all.map((d) => [
      `"${d.name.replace(/"/g, '""')}"`,
      `"${d.code}"`,
      `"${d.group.replace(/"/g, '""')}"`,
      d.debt,
      d.overdueDays.toString(),
      d.lastPayment ?? '—',
      d.reminders.toString(),
      d.critical ? 'Kritik' : 'Oddiy',
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /** Admin orqali o'quvchiga qo'lda eslatma yuborish. */
  async sendManualReminder(user: RequestUser, studentId: string): Promise<SendReminderResponse> {
    await this.studentScope.assertVisible(user, studentId);

    const branchId = '01900000-0000-7000-8000-000000000001';
    const students = await this.repo.findStudentsWithPositiveLedger(branchId);
    const st = students.find((s) => s.id === studentId);
    if (!st) throw new AppException(HttpStatus.BAD_REQUEST, 'BAD_REQUEST');

    const guardian = await this.repo.findPrimaryGuardian(studentId);
    const reminder = await this.repo.createReminder({
      branchId,
      studentId,
      guardianId: guardian?.guardianId ?? null,
      invoiceId: null,
      type: 'manual',
      debtAmount: st.debt,
      overdueDays: 0,
      channel: 'telegram',
    });

    if (this.telegramOutbox && guardian?.userId) {
      await this.telegramOutbox.enqueue(
        {
          method: 'sendMessage',
          chatId: guardian.userId,
          payload: {
            text: `Hurmatli ${guardian.fullName}, to'lov bo'yicha qarzingiz mavjud: ${st.debt} so'm.`,
          },
        },
        { dedupeKey: `remind:manual:${studentId}:${reminder.id}` },
      );
    }

    const map = await this.repo.countRemindersForStudents([studentId]);
    return {
      success: true,
      reminderCount: map.get(studentId) ?? 1,
      sentAt: reminder.sentAt.toISOString(),
    };
  }

  /** BR-21: Eslatmalar jadvali (-3 kun, 0 kun, +3 kun, +7 kun, haftalik). */
  async processScheduledReminders(): Promise<{ sentCount: number }> {
    const today = this.clock.today();
    const invoices = await this.repo.findAllOpenInvoicesWithDetails();
    let sentCount = 0;

    for (const inv of invoices) {
      const type = this.determineMilestoneType(inv.dueDate, today);
      if (!type) continue;

      const alreadySent = await this.repo.hasReminderForInvoiceAndType(inv.invoiceId, type);
      if (alreadySent) continue;

      const guardian = await this.repo.findPrimaryGuardian(inv.studentId);
      await this.repo.createReminder({
        branchId: inv.branchId,
        studentId: inv.studentId,
        guardianId: guardian?.guardianId ?? null,
        invoiceId: inv.invoiceId,
        type,
        debtAmount: BigInt(inv.total),
        overdueDays: Math.max(0, diffInDays(today, inv.dueDate)),
        channel: 'telegram',
      });

      if (this.telegramOutbox && guardian?.userId) {
        await this.telegramOutbox.enqueue(
          {
            method: 'sendMessage',
            chatId: guardian.userId,
            payload: { text: `To'lov eslatmasi (${type}): ${inv.total} so'm.` },
          },
          { dedupeKey: `remind:sched:${inv.invoiceId}:${type}` },
        );
      }
      sentCount++;
    }

    this.logger.log(`BR-21 Eslatmalar yuborildi: ${sentCount} ta`);
    return { sentCount };
  }

  private determineMilestoneType(dueDate: string, today: string): string | null {
    const diff = diffInDays(dueDate, today); // dueDate - today
    if (diff === 3) return 'due_minus_3';
    if (diff === 0) return 'due_day';
    if (diff === -3) return 'overdue_3';
    if (diff === -7) return 'overdue_7';
    if (diff < -7 && (-diff - 7) % 7 === 0) return 'weekly';
    return null;
  }
}
