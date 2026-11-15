import type {
  Invoice,
  InvoiceWithLines,
  LessonDto,
  PaymentDetail,
  StudentLedgerSummary,
} from '@lg/contracts';
import { formatMonth } from '@lg/i18n';
import type { PaymentRow } from '../screens/guardian/payments.js';
import type { ChildSummary, ChildToday } from '../screens/guardian/home.js';
import type { Invoice as InvoiceRow } from '../screens/guardian/payments.js';
import type { AttendanceHistoryRow } from './student-map.js';
import { activeLessons, lessonInfo } from './teacher-map.js';
import { atTashkent } from './time.js';

/** `GET /attendance/history` qatori — kech qolish daqiqasi bilan. */
export type AttendanceRow = AttendanceHistoryRow & { lateMinutes: number | null };

/** Ota-onada kurs ro'yxati yo'q (group.view) — kurs nomi ko'rsatilmaydi. */
const NO_COURSES: ReadonlyMap<string, string> = new Map();

/**
 * Bugun: belgilangan bo'lsa — holat; dars bor, hali belgilanmagan — "kutilmoqda" (vaqti);
 * dars yo'q — "bugun dars yo'q".
 */
export function childToday(
  today: string,
  lessons: readonly LessonDto[],
  att: readonly AttendanceRow[],
): ChildToday {
  const mark = att.find((a) => a.date === today);
  if (mark)
    return mark.status === 'late'
      ? { kind: 'late', minutes: mark.lateMinutes ?? 0 }
      : { kind: mark.status };
  const lesson = activeLessons(lessons).find((l) => l.date === today);
  return lesson
    ? { kind: 'pending', at: atTashkent(lesson.date, lesson.startTime) }
    : { kind: 'none' };
}

/** BR-20: ledger summary `balance` — musbat avans; ekranda `debt` > 0 qarz, < 0 avans. */
export const debtOf = (s: StudentLedgerSummary): bigint => -BigInt(s.balance);

/** Eng yaqin to'lanmagan hisob muddati. */
export function nearestDue(invoices: readonly Invoice[]): Date | undefined {
  const open = invoices
    .filter((i) => i.status === 'open' || i.status === 'partially_paid')
    .map((i) => i.dueDate)
    .sort();
  return open[0] ? atTashkent(open[0], '23:59') : undefined;
}

export function childSummary(input: {
  id: string;
  name: string;
  today: string;
  now: Date;
  lessons: readonly LessonDto[];
  attendance: readonly AttendanceRow[];
  ledger: StudentLedgerSummary;
  invoices: readonly Invoice[];
}): ChildSummary {
  const next = activeLessons(input.lessons)
    .map((l) => lessonInfo(l, NO_COURSES))
    .find((l) => l.startsAt > input.now);
  const debt = debtOf(input.ledger);
  return {
    id: input.id,
    name: input.name,
    today: childToday(input.today, input.lessons, input.attendance),
    next,
    debt,
    dueDate: debt > 0n ? nearestDue(input.invoices) : undefined,
  };
}

/** Hisoblar ro'yxati (MG-05): to'langan qism — status bo'yicha (to'liq/qisman). */
export const invoiceRows = (
  invoices: readonly Invoice[],
  paidOf: (i: Invoice) => bigint,
  today: string,
): InvoiceRow[] =>
  invoices
    .filter((i) => i.status !== 'void')
    .map((i) => ({
      id: i.id,
      month: periodTitle(i.period),
      amount: BigInt(i.total),
      paid: paidOf(i),
      dueDate: atTashkent(i.dueDate, '23:59'),
      overdue: i.status !== 'paid' && i.dueDate < today,
    }));

export const periodTitle = (period: string): string =>
  formatMonth(atTashkent(`${period}-15`, '12:00'));

/**
 * To'langan qism: to'liq — jami; ochiq — 0; qisman — shu hisob qatorlariga to'lovlar
 * taqsimoti (allocations) yig'indisi (BR-12 eng eski qarzdan).
 */
export function paidAmount(
  inv: Invoice,
  detail: InvoiceWithLines | undefined,
  payments: readonly PaymentDetail[],
): bigint {
  if (inv.status === 'paid') return BigInt(inv.total);
  if (inv.status !== 'partially_paid' || !detail) return 0n;
  const lines = new Set(detail.lines.map((l) => l.id));
  return payments
    .flatMap((p) => p.allocations)
    .filter((a) => lines.has(a.invoiceLineId))
    .reduce((s, a) => s + BigInt(a.amount), 0n);
}

/** To'lovlar tarixi (MG-05): chek raqami bo'lganlari (bekor qilinganlari ham — tarix). */
export const METHOD: Record<PaymentDetail['method'], PaymentRow['method']> = {
  cash: 'cash',
  card: 'card_terminal',
  bank: 'transfer',
  other: 'other',
};

export const paymentRows = (payments: readonly PaymentDetail[]): PaymentRow[] =>
  payments.map((p) => ({
    id: p.id,
    date: new Date(p.paidAt),
    amount: BigInt(p.amount),
    method: METHOD[p.method],
    receiptNo: p.receiptNumber ?? '',
  }));
