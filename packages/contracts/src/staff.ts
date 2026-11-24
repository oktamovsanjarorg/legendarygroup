import { z } from 'zod';
import { PhoneSchema } from './auth.js';
import { PERMISSIONS } from './permissions.js';
import { ROLES } from './roles.js';

/** Director qo'shadigan xodim rollari (T-101). Director — faqat CLI (birinchi) orqali. */
export const STAFF_ROLES = ['admin', 'teacher'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

/** `POST /api/staff` — telefon, ism, rol (FR-AUTH-5). */
export const CreateStaffRequest = z.object({
  phone: PhoneSchema,
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(STAFF_ROLES),
});

/** `PATCH /api/staff/:userId` — ism yoki raqamni tuzatish (raqam almashsa, Telegram uziladi). */
export const UpdateStaffRequest = z.object({
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: PhoneSchema.optional(),
});

export const AddStaffRoleRequest = z.object({ role: z.enum(STAFF_ROLES) });

/**
 * Xodim qo'shildi (Q-98): `botUrl` — xodim botda o'z raqamini ulashadi va kiradi. `null` —
 * Telegram allaqachon ulangan. Parol, 2FA va bir martalik havola yo'q.
 */
export const CreateStaffResult = z.object({
  id: z.string(),
  botUrl: z.string().nullable(),
});

/** Ko'rinadigan holat: `invited` — Telegram hali ulanmagan. */
export const STAFF_STATUSES = ['active', 'invited', 'blocked'] as const;

export const StaffListItem = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  roles: z.array(z.enum(ROLES)),
  status: z.enum(STAFF_STATUSES),
  telegramLinked: z.boolean(),
  lastLoginAt: z.string().nullable(),
  overridesCount: z.number().int(),
});

export const StaffDetail = StaffListItem.extend({
  overrides: z.array(z.object({ permission: z.enum(PERMISSIONS), granted: z.boolean() })),
  /** Telegram ulanmagan bo'lsa — bot havolasi (doim bir xil, maxfiy emas). */
  botUrl: z.string().nullable(),
});

/** `GET /api/teachers` — faol ustozlar (guruh/dars formalarida tanlash uchun; faqat ism). */
export const TeacherOption = z.object({ id: z.string(), fullName: z.string() });

/** Bot → API (ichki): foydalanuvchi o'z kontaktini ulashdi (Telegram — `contact.user_id === from.id`). */
export const TelegramContactRequest = z.object({
  telegramId: z.coerce.bigint().positive(),
  phone: z.string().min(7).max(20),
  username: z.string().max(64).optional(),
});
export const TelegramContactResult = z.object({
  /**
   * `staff_linked` — xodim bog'landi; `conflict` — raqam boshqa Telegram'da yoki Telegram boshqa
   * foydalanuvchida; `not_found` — xodim emas (ota-ona oqimi — T-110).
   */
  result: z.enum(['staff_linked', 'already_linked', 'conflict', 'not_found']),
  fullName: z.string().optional(),
});

export type CreateStaffRequest = z.infer<typeof CreateStaffRequest>;
export type UpdateStaffRequest = z.infer<typeof UpdateStaffRequest>;
export type CreateStaffResult = z.infer<typeof CreateStaffResult>;
export type StaffListItem = z.infer<typeof StaffListItem>;
export type StaffDetail = z.infer<typeof StaffDetail>;
export type TeacherOption = z.infer<typeof TeacherOption>;
export type TelegramContactResult = z.infer<typeof TelegramContactResult>;
