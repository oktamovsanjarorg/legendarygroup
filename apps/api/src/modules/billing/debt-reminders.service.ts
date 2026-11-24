import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { DEFAULT_BRANCH_ID, type SendReminderResponse } from '@lg/contracts';
import type { Clock } from '@lg/domain';
import { formatDateShort, formatMoney } from '@lg/i18n';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { NotificationsService } from '../notifications/index.js';
import { StudentScopeService } from '../students/index.js';
import { DebtorsRepository } from './debtors.repository.js';
import { diffInDays } from './debtors.service.js';

type OpenInvoice = Awaited<ReturnType<DebtorsRepository['findAllOpenInvoicesWithDetails']>>[number];
interface DueReminder {
  invoice: OpenInvoice;
  type: string;
}

/**
 * Qarz eslatmalari (BR-21, Q-100): o'quvchi bo'yicha kuniga bitta xabar, faqat yetib boradigan
 * ota-onaga. Yuborilmagan xabar `payment_reminders`ga yozilmaydi.
 */
@Injectable()
export class DebtRemindersService {
  private readonly logger = new Logger(DebtRemindersService.name);

  constructor(
    @Inject(DebtorsRepository) private readonly repo: DebtorsRepository,
    @Inject(StudentScopeService) private readonly studentScope: StudentScopeService,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  /** Xodim qo'lda: kuniga bitta; takror — dedupe kaliti (parallel bosish ham bitta xabar). */
  async sendManual(user: RequestUser, studentId: string): Promise<SendReminderResponse> {
    this.studentScope.assertUnrestricted(user);
    await this.studentScope.assertVisible(user, studentId);
    const debtors = await this.repo.findStudentsWithPositiveLedger(DEFAULT_BRANCH_ID);
    const student = debtors.find((s) => s.id === studentId);
    if (!student) throw new AppException(HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
    const guardian = (await this.repo.findGuardians([studentId]))
      .get(studentId)
      ?.find((g) => g.linked);
    if (!guardian?.userId)
      throw new AppException(HttpStatus.CONFLICT, 'GUARDIAN_TELEGRAM_NOT_LINKED');

    const now = this.clock.now();
    const sent = await this.notifications.notify({
      userId: guardian.userId,
      type: 'billing_reminder',
      payload: { studentName: student.fullName, amount: formatMoney(student.debt) },
      dedupeKey: `remind:manual:${studentId}:${this.clock.today()}`,
      branchId: student.branchId,
    });
    if (!sent) throw new AppException(HttpStatus.CONFLICT, 'REMINDER_ALREADY_SENT');
    await this.repo.createReminders([
      {
        branchId: student.branchId,
        studentId,
        guardianId: guardian.guardianId,
        invoiceId: null,
        type: 'manual',
        debtAmount: student.debt,
        sentAt: now,
      },
    ]);
    const counts = await this.repo.countRemindersForStudents([studentId]);
    return {
      success: true,
      reminderCount: counts.get(studentId) ?? 1,
      sentAt: now.toISOString(),
    };
  }

  /** BR-21: -3 kun, muddat kuni, +3, +7, keyin haftalik. Bir o'quvchi — bitta xabar. */
  async processScheduledReminders(): Promise<{ sentCount: number }> {
    const byStudent = new Map<string, OpenInvoice[]>();
    for (const inv of await this.repo.findAllOpenInvoicesWithDetails())
      byStudent.set(inv.studentId, [...(byStudent.get(inv.studentId) ?? []), inv]);
    const guardians = await this.repo.findGuardians([...byStudent.keys()]);

    let sentCount = 0;
    for (const [studentId, open] of byStudent) {
      const guardian = guardians.get(studentId)?.find((g) => g.linked);
      if (!guardian?.userId) continue;
      const due = await this.dueReminders(open);
      if (due.length === 0) continue;
      await this.sendScheduled({ ...guardian, userId: guardian.userId }, open, due);
      sentCount++;
    }
    this.logger.log(`BR-21 Eslatmalar yuborildi: ${sentCount} ta`);
    return { sentCount };
  }

  private async dueReminders(open: readonly OpenInvoice[]): Promise<DueReminder[]> {
    const today = this.clock.today();
    const due: DueReminder[] = [];
    for (const invoice of open) {
      const type = this.determineMilestoneType(invoice.dueDate, today);
      if (type && !(await this.repo.hasReminderForInvoiceAndType(invoice.invoiceId, type)))
        due.push({ invoice, type });
    }
    return due;
  }

  private async sendScheduled(
    guardian: { guardianId: string; userId: string },
    open: readonly OpenInvoice[],
    due: readonly DueReminder[],
  ): Promise<void> {
    const today = this.clock.today();
    const now = this.clock.now();
    const oldest = open.reduce((a, b) => (b.dueDate < a.dueDate ? b : a));
    const total = open.reduce((sum, i) => sum + i.outstanding, 0n);
    await this.notifications.notify({
      userId: guardian.userId,
      type: 'billing_reminder',
      payload: {
        studentName: oldest.studentName,
        amount: formatMoney(total),
        dueDate: formatDateShort(new Date(`${oldest.dueDate}T00:00:00+05:00`)),
      },
      dedupeKey: `remind:sched:${oldest.studentId}:${today}`,
      branchId: oldest.branchId,
    });
    await this.repo.createReminders(
      due.map(({ invoice, type }) => ({
        branchId: invoice.branchId,
        studentId: invoice.studentId,
        guardianId: guardian.guardianId,
        invoiceId: invoice.invoiceId,
        type,
        debtAmount: invoice.outstanding,
        overdueDays: Math.max(0, diffInDays(today, invoice.dueDate)),
        sentAt: now,
      })),
    );
  }

  /** Kechikkan kunlar: musbat — muddat o'tgan. Cron kechiksa oraliq eslatma yo'qolmaydi. */
  determineMilestoneType(dueDate: string, today: string): string | null {
    const days = diffInDays(today, dueDate);
    if (days >= 14) return `weekly_${Math.floor((days - 7) / 7)}`;
    if (days >= 7) return 'overdue_7';
    if (days >= 3) return 'overdue_3';
    if (days >= 0) return 'due_day';
    return days >= -3 ? 'due_minus_3' : null;
  }
}
