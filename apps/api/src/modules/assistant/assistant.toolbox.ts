import {
  ASSISTANT_PREFILL_SCREENS,
  ASSISTANT_SCREEN_PERMISSION,
  ASSISTANT_STUDENT_SCREENS,
  type AssistantAction,
  type AssistantPrefill,
  type AssistantScreen,
  DEFAULT_BRANCH_ID,
  type Permission,
} from '@lg/contracts';
import { z } from 'zod';
import type { RequestUser } from '../auth/index.js';
import type { AssistantDeps } from './assistant.deps.js';
import {
  DebtorsInput,
  GroupsInput,
  LessonsInput,
  maskPhone,
  ScreenInput,
  SearchInput,
  StudentInput,
} from './assistant.tools.js';

/** Har forma faqat o'z maydonlarini oladi (model ortiqchasini yuborsa — tashlanadi). */
const PREFILL_FIELDS: Partial<Record<AssistantScreen, readonly (keyof AssistantPrefill)[]>> = {
  pay: ['amount'],
  newStudent: ['fullName', 'phone', 'guardianName', 'guardianPhone'],
  addExpense: ['amount', 'category', 'note'],
};

export function prefillFor(
  screen: AssistantScreen,
  p: AssistantPrefill | undefined,
): AssistantPrefill | undefined {
  const fields = PREFILL_FIELDS[screen];
  if (!p || !fields || !ASSISTANT_PREFILL_SCREENS.includes(screen)) return undefined;
  const out: Record<string, string> = {};
  for (const f of fields) {
    const v = p[f];
    if (v) out[f] = v;
  }
  return Object.keys(out).length ? (out as AssistantPrefill) : undefined;
}

export interface ToolOutcome {
  content: string;
  isError?: boolean;
}

const fail = (content: string): ToolOutcome => ({ content, isError: true });
const ok = (data: unknown): ToolOutcome => ({ content: JSON.stringify(data) });

/**
 * Vositalarni chaqiruvchining **o'z** ruxsati va scope'i bilan bajaradi (servislar RBAC'ni
 * o'zi tekshiradi; bu yerda — endpoint darajasidagi ruxsat). Kirish Zod bilan tekshiriladi.
 */
export class AssistantToolbox {
  readonly actions: AssistantAction[] = [];

  constructor(
    private readonly deps: AssistantDeps,
    private readonly user: RequestUser,
    private readonly perms: ReadonlySet<Permission>,
  ) {}

  private can(p: Permission) {
    return this.perms.has(p);
  }

  private readonly handlers: Record<string, (input: unknown) => Promise<ToolOutcome>> = {
    search_students: (i) => this.search(SearchInput.parse(i)),
    student_overview: (i) => this.overview(StudentInput.parse(i)),
    today_summary: () => this.today(),
    list_debtors: (i) => this.debtors(DebtorsInput.parse(i)),
    list_groups: (i) => this.groupList(GroupsInput.parse(i)),
    day_lessons: (i) => this.dayLessons(LessonsInput.parse(i)),
    open_screen: async (i) => this.screen(ScreenInput.parse(i)),
  };

  async run(name: string, input: unknown): Promise<ToolOutcome> {
    const handler = this.handlers[name];
    if (!handler) return fail(`Nomaʼlum vosita: ${name}`);
    try {
      return await handler(input);
    } catch (e) {
      if (e instanceof z.ZodError) return fail(`Notoʻgʻri kirish: ${e.issues[0]?.message ?? ''}`);
      const status = (e as { getStatus?: () => number }).getStatus?.();
      if (status === 403) return fail('Bu maʼlumotga ruxsatingiz yoʻq.');
      if (status === 404) return fail('Topilmadi.');
      throw e;
    }
  }

  private async search({ query }: z.infer<typeof SearchInput>) {
    if (!this.can('student.view')) return fail('Oʻquvchilarni koʻrish ruxsati yoʻq.');
    const r = await this.deps.students.list(this.user, { q: query, status: 'active', limit: 8 });
    return ok(
      r.items.map((s) => ({
        id: s.id,
        code: s.code,
        name: s.fullName,
        groups: s.groups.map((g) => g.name),
        frozen: s.frozen,
      })),
    );
  }

  private async overview({ student_id }: z.infer<typeof StudentInput>) {
    if (!this.can('student.view')) return fail('Oʻquvchilarni koʻrish ruxsati yoʻq.');
    const [s, enrollments] = await Promise.all([
      this.deps.students.detail(this.user, student_id),
      this.deps.enrollments.forStudent(this.user, student_id),
    ]);
    const ledger = this.can('billing.view')
      ? await this.deps.billing.getStudentLedgerSummary(this.user, student_id)
      : null;
    return ok({
      id: s.id,
      code: s.code,
      name: s.fullName,
      archived: s.archivedAt !== null,
      groups: enrollments
        .filter((e) => e.state === 'active' || e.state === 'frozen')
        .map((e) => ({ name: e.group.name, state: e.state, discountPercent: e.discountPercent })),
      // balance < 0 — qarz (so'm, butun son satr)
      debt: ledger ? ledger.totalDebt : null,
      advance: ledger ? ledger.totalAdvance : null,
      guardians: s.guardians.map((g) => ({
        name: g.fullName,
        phone: maskPhone(g.phone),
        telegram: g.linked,
      })),
    });
  }

  private async today() {
    if (!this.can('stats.operational')) return fail('Koʻrsatkichlarga ruxsat yoʻq.');
    const k = await this.deps.dashboard.getDirectorDashboardKpi(
      this.user,
      DEFAULT_BRANCH_ID,
      false,
    );
    return ok({
      revenueToday: k.revenueToday,
      revenueYesterday: k.revenueYesterday,
      revenueMonth: k.revenueMonth,
      attendancePercent: k.attendance,
      unmarkedLessons: k.unmarked,
      absentToday: k.absentToday,
      receiptQueue: k.queue,
      approvals: this.can('approval.decide') ? k.approvals : null,
      debtTotal: this.can('payment.review') ? k.debtTotal : null,
      activeStudents: k.activeStudents,
    });
  }

  private async debtors({ bucket, limit }: z.infer<typeof DebtorsInput>) {
    if (!this.can('payment.review')) return fail('Qarzdorlar roʻyxatiga ruxsat yoʻq.');
    const r = await this.deps.debtors.getDebtors(this.user, {
      bucket: bucket ?? 'all',
      limit: limit ?? 10,
    });
    return ok({
      totalDebt: r.totalDebt,
      items: r.items.map((d) => ({
        id: d.id,
        code: d.code,
        name: d.name,
        group: d.group,
        debt: d.debt,
        overdueDays: d.overdueDays,
        lastPayment: d.lastPayment,
      })),
    });
  }

  private async groupList({ query }: z.infer<typeof GroupsInput>) {
    if (!this.can('group.view')) return fail('Guruhlarni koʻrish ruxsati yoʻq.');
    const all = await this.deps.groups.list(this.user, { status: 'current' });
    const q = query?.toLowerCase();
    return ok(
      all
        .filter((g) => !q || g.name.toLowerCase().includes(q))
        .slice(0, 30)
        .map((g) => ({
          id: g.id,
          name: g.name,
          course: g.course.name,
          teacher: g.mainTeacher?.fullName ?? null,
          monthlyPrice: g.monthlyPrice,
          room: g.room?.name ?? null,
          schedule: g.slots,
          status: g.status,
        })),
    );
  }

  private async dayLessons({ date }: z.infer<typeof LessonsInput>) {
    if (!this.can('group.view')) return fail('Darslarni koʻrish ruxsati yoʻq.');
    const today = this.deps.clock.today();
    const day = date ?? today;
    const list = await this.deps.lessons.calendar(this.user, { from: day, to: day });
    return ok({
      today,
      date: day,
      lessons: list
        .sort((a, b) => a.startTime.localeCompare(b.startTime))
        .map((l) => ({
          time: `${l.startTime}–${l.endTime}`,
          group: l.group.name,
          teacher: l.teacher?.name ?? null,
          room: l.room?.name ?? null,
          status: l.status,
          topic: l.topic,
        })),
    });
  }

  private screen({ screen, student_id, label, prefill }: z.infer<typeof ScreenInput>): ToolOutcome {
    if (!this.can(ASSISTANT_SCREEN_PERMISSION[screen]))
      return fail('Bu ekranga ruxsatingiz yoʻq — taklif qilmang.');
    if (ASSISTANT_STUDENT_SCREENS.includes(screen) && !student_id)
      return fail('Bu ekran uchun student_id kerak: avval search_students.');
    if (this.actions.length >= 4) return fail('Tugmalar yetarli.');
    const dup = this.actions.some((a) => a.screen === screen && a.studentId === student_id);
    const filled = prefillFor(screen, prefill);
    if (!dup)
      this.actions.push({
        screen,
        ...(student_id ? { studentId: student_id } : {}),
        ...(label ? { label } : {}),
        ...(filled ? { prefill: filled } : {}),
      });
    return ok({ shown: true, prefilled: !!filled });
  }
}
