import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import type { AuditContext } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { type RateLimit, RateLimiter } from '../../common/rate-limit/rate-limiter.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';
import { AuthService, type Issued } from './auth.service.js';
import type { ClientMeta } from './sessions.service.js';
import { defaultWebRole, StaffUsers } from './staff-users.js';
import { confirmedKey, pendingKey, TelegramChallenges } from './telegram-challenges.js';

export { CHALLENGE_TTL_S } from './telegram-challenges.js';
/** Telefon bo'yicha — begona odam xodimga xabar yog'dirmasin; IP — keng (markazda bitta NAT). */
const PHONE_LIMIT: RateLimit = { scope: 'login:tg:phone', limit: 5, windowS: 60 };
const IP_LIMIT: RateLimit = { scope: 'login:tg', limit: 30, windowS: 60 };

/**
 * "Telegram orqali kirish" (FR-AUTH-3 muqobili): web → challenge → bot xodimga tasdiq tugmasini
 * yuboradi (`StaffTelegramLoginRequested` event, T-010/T-109) → bot `/internal/auth/telegram/confirm`
 * → web poll qiladi va sessiya oladi. Telegram akkauntiga egalik — ikkinchi omil.
 * Noma'lum telefon uchun ham challenge qaytadi (foydalanuvchi mavjudligi oshkor bo'lmaydi).
 */
@Injectable()
export class TelegramLoginService {
  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(TelegramChallenges) private readonly challenges: TelegramChallenges,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  async start(
    phone: string,
    ip: string | null,
  ): Promise<{ challengeId: string; expiresAt: string }> {
    await this.limiter.hit(IP_LIMIT, ip ?? 'unknown');
    await this.limiter.hit(PHONE_LIMIT, phone);
    const user = await this.staff.byPhone(phone);
    const eligible =
      user && user.status === 'active' && user.telegramId && defaultWebRole(user.roles);
    return this.challenges.create(eligible ? user.id : null);
  }

  /** Bot tasdig'i: tugmani bosgan Telegram akkaunti aynan shu xodimniki bo'lishi shart. */
  async confirm(challengeId: string, telegramId: bigint): Promise<boolean> {
    const userId = await this.redis.get(pendingKey(challengeId));
    if (!userId) return false;
    const user = await this.staff.byId(userId);
    if (!user || user.telegramId !== telegramId) return false;
    const ttl = await this.redis.ttl(pendingKey(challengeId));
    const value = JSON.stringify({ userId, telegramId: telegramId.toString() });
    await this.redis.set(confirmedKey(challengeId), value, 'EX', Math.max(ttl, 1));
    await this.redis.del(pendingKey(challengeId));
    return true;
  }

  /** Tasdiqlangan bo'lsa — sessiya (bir marta: GETDEL). Aks holda 202 "kutilmoqda". */
  async poll(challengeId: string, meta: ClientMeta, ctx: AuditContext): Promise<Issued> {
    const raw = await this.takeConfirmed(challengeId);
    const { userId, telegramId } = JSON.parse(raw) as { userId: string; telegramId: string };
    const user = await this.staff.byId(userId);
    // Tasdiqdan keyin bloklangan yoki Telegram'i uzilgan/almashgan bo'lsa — sessiya yo'q (Q-98)
    if (!user || user.status !== 'active' || user.telegramId?.toString() !== telegramId) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_MFA_TOKEN');
    }
    return this.auth.issue(user, { meta, ctx, method: 'telegram' });
  }

  /**
   * `confirm` avval natijani yozadi, keyin kutishni o'chiradi. Shuning uchun kutish yo'q bo'lsa,
   * natija oradagi lahzada kelgan bo'lishi mumkin — 401 dan oldin yana bir marta qaraladi.
   */
  private async takeConfirmed(challengeId: string): Promise<string> {
    const first = await this.redis.getdel(confirmedKey(challengeId));
    if (first) return first;
    if ((await this.redis.exists(pendingKey(challengeId))) === 1)
      throw new AppException(HttpStatus.ACCEPTED, 'TELEGRAM_LOGIN_PENDING');
    const late = await this.redis.getdel(confirmedKey(challengeId));
    if (late) return late;
    throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_MFA_TOKEN');
  }
}
