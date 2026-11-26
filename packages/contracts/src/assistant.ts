import { z } from 'zod';
import { EXPENSE_CATEGORIES } from './expenses.js';
import type { Permission } from './permissions.js';

/**
 * AI yordamchi (Q-114, Q-122): yordamchi faqat **o'qiydi**, kerakli ekranni ochib beradi va
 * formani oldindan to'ldirishi mumkin (`prefill`). Saqlash — doim odatdagi forma orqali,
 * foydalanuvchi o'zi tekshirib tasdiqlaydi (ledger, RBAC, audit o'zgarmaydi).
 * Ekranlar ro'yxati yopiq: model yo'l o'ylab topa olmaydi.
 */
export const ASSISTANT_SCREENS = [
  'student',
  'pay',
  'newStudent',
  'debtors',
  'queue',
  'approvals',
  'attendance',
  'leads',
  'groups',
  'calendar',
  'payments',
  'cash',
  'finance',
  'addExpense',
  'reports',
  'announcements',
  'tickets',
] as const;
export type AssistantScreen = (typeof ASSISTANT_SCREENS)[number];

/** Ekran → kerakli ruxsat (Mini App menyusi bilan bir xil). */
export const ASSISTANT_SCREEN_PERMISSION: Record<AssistantScreen, Permission> = {
  student: 'student.view',
  pay: 'payment.create',
  newStudent: 'student.manage',
  debtors: 'payment.review',
  queue: 'payment.review',
  approvals: 'approval.decide',
  attendance: 'attendance.edit_past',
  leads: 'lead.manage',
  groups: 'group.view',
  calendar: 'lesson.manage',
  payments: 'payment.review',
  cash: 'cash.close',
  finance: 'finance.view',
  addExpense: 'expense.manage',
  reports: 'stats.operational',
  announcements: 'announcement.send',
  tickets: 'ticket.handle',
};

/** O'quvchi tanlanishi shart bo'lgan ekranlar. */
export const ASSISTANT_STUDENT_SCREENS: readonly AssistantScreen[] = ['student', 'pay'];

export const AssistantTurn = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2000),
});
export type AssistantTurn = z.infer<typeof AssistantTurn>;

export const AssistantChatRequest = z.object({
  /** Oxirgi 20 xabar; birinchisi — foydalanuvchiniki. */
  messages: z
    .array(AssistantTurn)
    .min(1)
    .max(20)
    .refine((m) => m[m.length - 1]?.role === 'user', 'oxirgi xabar foydalanuvchiniki'),
});
export type AssistantChatRequest = z.infer<typeof AssistantChatRequest>;

/** Formani oldindan to'ldirish (T-175): faqat `pay`, `newStudent`, `addExpense`. */
export const ASSISTANT_PREFILL_SCREENS: readonly AssistantScreen[] = [
  'pay',
  'newStudent',
  'addExpense',
];

export const AssistantPrefill = z
  .object({
    /** So'm, butun son satr (pul — faqat bigint). */
    amount: z.string().regex(/^[1-9]\d{0,11}$/),
    fullName: z.string().trim().min(3).max(120),
    phone: z.string().trim().max(20),
    guardianName: z.string().trim().max(120),
    guardianPhone: z.string().trim().max(20),
    category: z.enum(EXPENSE_CATEGORIES),
    note: z.string().trim().max(200),
  })
  .partial();
export type AssistantPrefill = z.infer<typeof AssistantPrefill>;

export const AssistantAction = z.object({
  screen: z.enum(ASSISTANT_SCREENS),
  prefill: AssistantPrefill.optional(),
  studentId: z.uuid().optional(),
  /** Tugmada ko'rinadigan qisqa izoh (masalan, o'quvchi ismi). */
  label: z.string().max(80).optional(),
});
export type AssistantAction = z.infer<typeof AssistantAction>;

export const AssistantChatResponse = z.object({
  reply: z.string(),
  actions: z.array(AssistantAction).max(4),
});
export type AssistantChatResponse = z.infer<typeof AssistantChatResponse>;
