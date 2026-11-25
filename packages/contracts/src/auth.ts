import { z } from 'zod';
import { ROLES } from './roles.js';

/** E.164, O'zbekiston va xalqaro (05-data-model.md `users.phone`). */
export const PhoneSchema = z.string().regex(/^\+[1-9][0-9]{6,14}$/);

export const TelegramLoginStartRequest = z.object({ phone: PhoneSchema });
export const TelegramLoginPollRequest = z.object({ challengeId: z.string().uuid() });

/** Mini App (T-007): Telegram `initData` → access token. Bir nechta rol bo'lsa `role` bilan qayta. */
export const TelegramAuthRequest = z.object({
  initData: z.string().min(10).max(4096),
  role: z.enum(ROLES).optional(),
});

/**
 * C-03 Mini App ichida bog'lanish (Q-111): `initData` (kim) + `requestContact` imzoli javobi
 * (qaysi raqam). Bot oraliq bo'g'in emas.
 */
export const TelegramOnboardRequest = z.object({
  initData: z.string().min(10).max(4096),
  contact: z.string().min(10).max(4096),
  /** Raqam topilmasa — ota-ona sifatida bog'lanish so'rovi (foydalanuvchi o'zi tanlaydi). */
  createRequest: z.boolean().default(false),
});
export type TelegramOnboardRequest = z.input<typeof TelegramOnboardRequest>;

export const TELEGRAM_ONBOARD_RESULTS = [
  'linked',
  'request_created',
  'pending_approval',
  'not_found',
  'conflict',
] as const;
export const TelegramOnboardResult = z.object({ result: z.enum(TELEGRAM_ONBOARD_RESULTS) });
export type TelegramOnboardResult = z.infer<typeof TelegramOnboardResult>;

export const TelegramStatusRequest = z.object({ initData: z.string().min(10).max(4096) });
export type TelegramStatusRequest = z.infer<typeof TelegramStatusRequest>;
export const TelegramOnboardStatus = z.object({
  status: z.enum(['not_registered', 'pending_approval', 'linked', 'rejected']),
  rejectReason: z.string().optional(),
});
export type TelegramOnboardStatus = z.infer<typeof TelegramOnboardStatus>;

/** O'quvchi: raqam (o'zi yoki ota-onasi) + Admin bergan 6 xonali kod (T-126). */
export const TelegramStudentOnboardRequest = z.object({
  initData: z.string().min(10).max(4096),
  contact: z.string().min(10).max(4096),
  code: z.string().regex(/^\d{6}$/),
});
export type TelegramStudentOnboardRequest = z.infer<typeof TelegramStudentOnboardRequest>;

export const SwitchRoleRequest = z.object({ role: z.enum(ROLES) });

export const AuthUser = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  roles: z.array(z.enum(ROLES)),
  activeRole: z.enum(ROLES),
  /** Telegram bog'langanmi (web: "Telegramni ulash" kartasi faqat bog'lanmaganda). */
  telegramLinked: z.boolean(),
});

/** Sessiya berilgan javob (Telegram kirishi, panel-handoff). Parol/TOTP bosqichlari yo'q (T-147). */
export const LoginResult = z.object({
  next: z.literal('done'),
  accessToken: z.string(),
  user: AuthUser,
});

/** `GET /api/auth/me` — UI menyusi va tugmalar uchun samarali ruxsatlar (faol rol bo'yicha). */
export const MeResult = AuthUser.extend({ permissions: z.array(z.string()) });
export type MeResult = z.infer<typeof MeResult>;

export const TelegramAuthResult = z.discriminatedUnion('next', [
  z.object({ next: z.literal('done'), accessToken: z.string(), user: AuthUser }),
  z.object({ next: z.literal('choose_role'), roles: z.array(z.enum(ROLES)) }),
]);

export const TelegramLoginStartResult = z.object({
  challengeId: z.string(),
  expiresAt: z.string(),
});

/** Bot (ichki API) tasdig'i — T-010. */
export const TelegramLoginConfirmRequest = z.object({
  challengeId: z.string().uuid(),
  telegramId: z.coerce.bigint().positive(),
});
export const TelegramLoginConfirmResult = z.object({ confirmed: z.boolean() });

/**
 * Mini App → web panel (T-121): bir martalik, 60 soniyalik kalit. URL fragmentda (`#t=`) —
 * server/proksi loglariga tushmaydi.
 */
export const PanelHandoffResult = z.object({ url: z.string().url(), expiresAt: z.string() });
export const PanelHandoffRedeemRequest = z.object({ token: z.string().min(20).max(128) });

export const SessionInfo = z.object({
  id: z.string(),
  device: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  current: z.boolean(),
});

export type LoginResult = z.infer<typeof LoginResult>;
export type TelegramAuthResult = z.infer<typeof TelegramAuthResult>;
export type AuthUser = z.infer<typeof AuthUser>;
export type SessionInfo = z.infer<typeof SessionInfo>;
export type PanelHandoffResult = z.infer<typeof PanelHandoffResult>;
