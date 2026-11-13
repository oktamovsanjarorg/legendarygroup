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

export const AddStaffRoleRequest = z.object({ role: z.enum(STAFF_ROLES) });

/**
 * Taklif: Admin — web (`/invite/<token>`: parol + TOTP); Ustoz — bot (`t.me/<bot>?start=inv_<token>`:
 * telefon ulashadi). `null` — taklif shart emas (foydalanuvchi allaqachon kira oladi).
 */
export const StaffInvite = z.object({
  channel: z.enum(['web', 'bot']),
  url: z.string(),
  expiresAt: z.string(),
});

export const CreateStaffResult = z.object({
  id: z.string(),
  invite: StaffInvite.nullable(),
});

/** Ko'rinadigan holat: `invited` — hali sozlanmagan, taklifi amalda. */
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
  /** Amaldagi taklif (bo'lsa) — havolani qayta ko'rsatish mumkin emas (token xeshlangan). */
  inviteExpiresAt: z.string().nullable(),
});

/** `GET /api/teachers` — faol ustozlar (guruh/dars formalarida tanlash uchun; faqat ism). */
export const TeacherOption = z.object({ id: z.string(), fullName: z.string() });

/** Bot → API (ichki): `/start inv_<token>` tekshiruvi. */
export const StaffInviteCheckRequest = z.object({ token: z.string().min(20).max(64) });
export const StaffInviteCheckResult = z.discriminatedUnion('valid', [
  z.object({ valid: z.literal(true), fullName: z.string() }),
  z.object({ valid: z.literal(false) }),
]);

/** Bot → API (ichki): foydalanuvchi o'z kontaktini ulashdi (Telegram — `contact.user_id === from.id`). */
export const TelegramContactRequest = z.object({
  telegramId: z.coerce.bigint().positive(),
  phone: z.string().min(7).max(20),
  username: z.string().max(64).optional(),
});
export const TelegramContactResult = z.object({
  /** `staff_linked` — xodim bog'landi; `not_found` — taklif yo'q (ota-ona oqimi — T-110). */
  result: z.enum(['staff_linked', 'already_linked', 'not_found']),
  fullName: z.string().optional(),
});

export type CreateStaffRequest = z.infer<typeof CreateStaffRequest>;
export type CreateStaffResult = z.infer<typeof CreateStaffResult>;
export type StaffInvite = z.infer<typeof StaffInvite>;
export type StaffListItem = z.infer<typeof StaffListItem>;
export type StaffDetail = z.infer<typeof StaffDetail>;
export type TeacherOption = z.infer<typeof TeacherOption>;
export type StaffInviteCheckResult = z.infer<typeof StaffInviteCheckResult>;
export type TelegramContactResult = z.infer<typeof TelegramContactResult>;
