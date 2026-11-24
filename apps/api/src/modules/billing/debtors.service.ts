import { Inject, Injectable } from '@nestjs/common';
import { normalizeUz } from '@lg/i18n';
import type {
  DebtorBucket,
  DebtorItem,
  DebtorListQueryInput,
  DebtorListResponse,
} from '@lg/contracts';
import { type Clock, isDebtCritical, tashkentDayRange } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { StudentScopeService } from '../students/index.js';
import {
  type DebtorGroupInfo,
  type DebtorGuardian,
  type DebtorInvoiceInfo,
  DebtorsRepository,
  type RawDebtorStudent,
} from './debtors.repository.js';

export function diffInDays(dateA: string, dateB: string): number {
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

/** Ism, kod (apostrof yozuvi farqsiz) yoki ota-ona telefoni (kamida 4 raqam). */
function matchesSearch(item: DebtorItem, search: string): boolean {
  const q = normalizeUz(search);
  const digits = q.replace(/\D/g, '');
  if (normalizeUz(item.name).includes(q) || normalizeUz(item.code).includes(q)) return true;
  return digits.length >= 4 && (item.guardian?.phone.includes(digits) ?? false);
}

function matchesFilters(
  item: DebtorItem,
  query: DebtorListQueryInput,
  studentGroups: DebtorGroupInfo[],
): boolean {
  if (!matchBucket(query.bucket, item.overdueDays)) return false;
  if (query.criticalOnly && !item.critical) return false;
  if (query.groupId && !studentGroups.some((g) => g.groupId === query.groupId)) return false;
  return !query.search || matchesSearch(item, query.search);
}

@Injectable()
export class DebtorsService {
  constructor(
    @Inject(DebtorsRepository) private readonly repo: DebtorsRepository,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  /** Qarzdor (ledger > 0, arxivda emas) o'quvchilar — e'lon auditoriyasi MS-08 bilan bir xil. */
  async debtorStudentIds(branchId: string): Promise<string[]> {
    return (await this.repo.findStudentsWithPositiveLedger(branchId)).map((s) => s.id);
  }

  /** Barcha qarzdorlarni yig'adi va filtrlarni qo'llaydi. */
  private async buildDebtorItems(
    branchId: string,
    query: DebtorListQueryInput,
  ): Promise<DebtorItem[]> {
    const today = this.clock.today();
    const students = await this.repo.findStudentsWithPositiveLedger(branchId);
    if (students.length === 0) return [];

    const studentIds = students.map((s) => s.id);
    const [groups, invoices, lastPayments, reminderCounts, guardians, remindedToday] =
      await Promise.all([
        this.repo.findActiveGroupsForStudents(studentIds, today),
        this.repo.findOpenInvoicesForStudents(studentIds),
        this.repo.findLastPaymentsForStudents(studentIds),
        this.repo.countRemindersForStudents(studentIds),
        this.repo.findGuardians(studentIds),
        this.repo.findManuallyReminded(studentIds, tashkentDayRange(today).start),
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
        guardians: guardians.get(s.id) ?? [],
        remindedToday: remindedToday.has(s.id),
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
    guardians: DebtorGuardian[];
    remindedToday: boolean;
  }): DebtorItem {
    const { student, today, groups, invoices, lastPayment, reminders, guardians } = params;
    const primary = guardians[0];

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
      guardian: primary ? { name: primary.fullName, phone: primary.phone } : null,
      canRemind: guardians.some((g) => g.linked),
      remindedToday: params.remindedToday,
    };
  }

  /** W-15 Qarzdorlar ro'yxati (aging, saralash, filtr). */
  async getDebtors(user: RequestUser, query: DebtorListQueryInput): Promise<DebtorListResponse> {
    this.studentScope.assertUnrestricted(user);
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
    this.studentScope.assertUnrestricted(user);
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
}
