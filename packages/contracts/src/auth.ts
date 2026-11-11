import { z } from 'zod';
import { ROLES } from './roles.js';

/** E.164, O'zbekiston va xalqaro (05-data-model.md `users.phone`). */
export const PhoneSchema = z.string().regex(/^\+[1-9][0-9]{6,14}$/);

/** Parol siyosati: uzunlik — asosiy himoya (NIST 800-63B); murakkablik qoidalari yo'q. */
export const PasswordSchema = z.string().min(10).max(128);

export const TotpCodeSchema = z.string().regex(/^[0-9]{6}$/);
/** Zaxira kod: `xxxx-xxxx` (bosh/kichik harf farqsiz). */
export const BackupCodeSchema = z.string().regex(/^[a-z0-9]{4}-[a-z0-9]{4}$/i);

export const LoginRequest = z.object({ phone: PhoneSchema, password: z.string().min(1).max(128) });

/** MFA bosqichi: qisqa muddatli (5 daq) token, faqat shu bosqich uchun. */
export const MfaRequest = z.object({ mfaToken: z.string().min(1) });
export const TotpEnableRequest = MfaRequest.extend({ code: TotpCodeSchema });
export const TotpVerifyRequest = z.union([
  MfaRequest.extend({ code: TotpCodeSchema }),
  MfaRequest.extend({ backupCode: BackupCodeSchema }),
]);

export const InviteAcceptRequest = z.object({
  token: z.string().min(20).max(200),
  password: PasswordSchema,
});

export const TelegramLoginStartRequest = z.object({ phone: PhoneSchema });
export const TelegramLoginPollRequest = z.object({ challengeId: z.string().uuid() });

/** Mini App (T-007): Telegram `initData` → access token. Bir nechta rol bo'lsa `role` bilan qayta. */
export const TelegramAuthRequest = z.object({
  initData: z.string().min(10).max(4096),
  role: z.enum(ROLES).optional(),
});

export const SwitchRoleRequest = z.object({ role: z.enum(ROLES) });

export const AuthUser = z.object({
  id: z.string(),
  fullName: z.string(),
  phone: z.string(),
  roles: z.array(z.enum(ROLES)),
  activeRole: z.enum(ROLES),
});

/** Login javobi: yoki sessiya, yoki keyingi MFA qadami. */
export const LoginResult = z.discriminatedUnion('next', [
  z.object({ next: z.literal('done'), accessToken: z.string(), user: AuthUser }),
  z.object({ next: z.literal('totp'), mfaToken: z.string() }),
  z.object({ next: z.literal('totp_setup'), mfaToken: z.string() }),
]);

export const TelegramAuthResult = z.discriminatedUnion('next', [
  z.object({ next: z.literal('done'), accessToken: z.string(), user: AuthUser }),
  z.object({ next: z.literal('choose_role'), roles: z.array(z.enum(ROLES)) }),
]);

export const TotpSetupResult = z.object({ otpauthUrl: z.string(), secret: z.string() });
export const TotpEnableResult = z.object({
  accessToken: z.string(),
  user: AuthUser,
  /** Faqat bir marta ko'rsatiladi. */
  backupCodes: z.array(z.string()),
});

export const TelegramLoginStartResult = z.object({
  challengeId: z.string(),
  expiresAt: z.string(),
});

/** Bot (ichki API) tasdig'i — T-010. */
export const TelegramLoginConfirmRequest = z.object({
  challengeId: z.string().uuid(),
  telegramId: z.coerce.bigint().positive(),
});

export const SessionInfo = z.object({
  id: z.string(),
  device: z.string().nullable(),
  ip: z.string().nullable(),
  createdAt: z.string(),
  current: z.boolean(),
});

export type LoginRequest = z.infer<typeof LoginRequest>;
export type LoginResult = z.infer<typeof LoginResult>;
export type AuthUser = z.infer<typeof AuthUser>;
export type SessionInfo = z.infer<typeof SessionInfo>;
