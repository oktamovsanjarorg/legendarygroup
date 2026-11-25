import {
  ASSISTANT_SCREEN_PERMISSION,
  ASSISTANT_SCREENS,
  ASSISTANT_STUDENT_SCREENS,
  type AssistantAction,
  DEFAULT_BRANCH_ID,
  DEBTOR_BUCKETS,
  type Permission,
} from '@lg/contracts';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import type { RequestUser } from '../auth/index.js';
import type { AssistantDeps } from './assistant.deps.js';

type Tool = Anthropic.Beta.Messages.BetaTool;

/** Telefon — faqat oxirgi 4 raqam (PII modelga to'liq ketmaydi). */
export const maskPhone = (p: string | null | undefined) =>
  p ? `***${p.replace(/\D/g, '').slice(-4)}` : null;

const SearchInput = z.object({ query: z.string().trim().min(2).max(100) });
const StudentInput = z.object({ student_id: z.uuid() });
const DebtorsInput = z.object({
  bucket: z.enum(DEBTOR_BUCKETS).optional(),
  limit: z.number().int().min(1).max(20).optional(),
});
const ScreenInput = z.object({
  screen: z.enum(ASSISTANT_SCREENS),
  student_id: z.uuid().optional(),
  label: z.string().max(80).optional(),
});

const obj = (properties: Record<string, unknown>, required: string[]) => ({
  type: 'object' as const,
  properties,
  required,
  additionalProperties: false,
});

/** Yordamchi vositalari: hammasi o'qish; `open_screen` — faqat tugma taklif qiladi. */
export const ASSISTANT_TOOLS: Tool[] = [
  {
    name: 'search_students',
    description:
      "O'quvchini ism, familiya, kod yoki telefon bo'yicha qidiradi. Natija: id, kod, ism, guruhlar, holat.",
    input_schema: obj({ query: { type: 'string', description: 'Kamida 2 belgi' } }, ['query']),
    strict: true,
  },
  {
    name: 'student_overview',
    description:
      "Bitta o'quvchi: guruhlari, qarzi/avansi (so'mda), ota-onalari (telefon yashirin). Avval search_students bilan id toping.",
    input_schema: obj({ student_id: { type: 'string' } }, ['student_id']),
    strict: true,
  },
  {
    name: 'today_summary',
    description:
      "Bugungi ko'rsatkichlar: tushum (bugun/kecha, so'm), davomat %, belgilanmagan darslar, kelmaganlar, chek navbati, tasdiqlash so'rovlari, umumiy qarz, faol o'quvchilar.",
    input_schema: obj({}, []),
    strict: true,
  },
  {
    name: 'list_debtors',
    description: "Qarzdorlar ro'yxati (eng katta qarz birinchi). bucket: muddati bo'yicha filtr.",
    input_schema: obj(
      {
        bucket: { type: 'string', enum: [...DEBTOR_BUCKETS] },
        limit: { type: 'integer', minimum: 1, maximum: 20 },
      },
      [],
    ),
    strict: true,
  },
  {
    name: 'open_screen',
    description:
      "Foydalanuvchiga ilova ekranini ochadigan tugma qo'shadi. Har qanday o'zgartirish (to'lov kiritish, yangi o'quvchi, davomat, xarajat) faqat shu yo'l bilan: foydalanuvchi formani o'zi to'ldirib tasdiqlaydi. 'student' va 'pay' uchun student_id shart.",
    input_schema: obj(
      {
        screen: { type: 'string', enum: [...ASSISTANT_SCREENS] },
        student_id: { type: 'string' },
        label: { type: 'string', description: "Tugmadagi qisqa izoh, masalan o'quvchi ismi" },
      },
      ['screen'],
    ),
    strict: true,
  },
];

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

  private screen({ screen, student_id, label }: z.infer<typeof ScreenInput>): ToolOutcome {
    if (!this.can(ASSISTANT_SCREEN_PERMISSION[screen]))
      return fail('Bu ekranga ruxsatingiz yoʻq — taklif qilmang.');
    if (ASSISTANT_STUDENT_SCREENS.includes(screen) && !student_id)
      return fail('Bu ekran uchun student_id kerak: avval search_students.');
    if (this.actions.length >= 4) return fail('Tugmalar yetarli.');
    const dup = this.actions.some((a) => a.screen === screen && a.studentId === student_id);
    if (!dup)
      this.actions.push({
        screen,
        ...(student_id ? { studentId: student_id } : {}),
        ...(label ? { label } : {}),
      });
    return ok({ shown: true });
  }
}
