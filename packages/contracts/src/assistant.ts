import { z } from 'zod';
import type { Permission } from './permissions.js';

/**
 * AI yordamchi (Q-114): yordamchi faqat **o'qiydi** va kerakli ekranni ochib beradi. Yozish
 * (to'lov, o'quvchi, davomat) — doim odatdagi forma orqali, foydalanuvchi o'zi tasdiqlaydi.
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

export const AssistantAction = z.object({
  screen: z.enum(ASSISTANT_SCREENS),
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
