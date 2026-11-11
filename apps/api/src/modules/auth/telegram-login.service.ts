import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Clock } from '@lg/domain';
import type { Redis } from 'ioredis';
import { uuidv7 } from 'uuidv7';
import type { AuditContext } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { type RateLimit, RateLimiter } from '../../common/rate-limit/rate-limiter.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';
import { OutboxService } from '../outbox/index.js';
import { AuthService, type Issued } from './auth.service.js';
import type { ClientMeta } from './sessions.service.js';
import { defaultWebRole, StaffUsers } from './staff-users.js';

export const CHALLENGE_TTL_S = 300; // 5 daqiqa (T-006 Aniqlik)
const START_LIMIT: RateLimit = { scope: 'login:tg', limit: 5, windowS: 60 };
const pendingKey = (id: string) => `auth:tg:pending:${id}`;
const confirmedKey = (id: string) => `auth:tg:ok:${id}`;

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
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RateLimiter) private readonly limiter: RateLimiter,
  ) {}

  async start(
    phone: string,
    ip: string | null,
  ): Promise<{ challengeId: string; expiresAt: string }> {
    await this.limiter.hit(START_LIMIT, ip ?? 'unknown');
    const challengeId = uuidv7();
    const expiresAt = new Date(this.clock.now().getTime() + CHALLENGE_TTL_S * 1000).toISOString();
    const user = await this.staff.byPhone(phone);
    const eligible =
      user && user.status === 'active' && user.telegramId && defaultWebRole(user.roles);
    await this.redis.set(pendingKey(challengeId), eligible ? user.id : '', 'EX', CHALLENGE_TTL_S);
    if (eligible) {
      await this.outbox.publish('StaffTelegramLoginRequested', {
        challengeId,
        userId: user.id,
        expiresAt,
      });
    }
    return { challengeId, expiresAt };
  }

  /** Bot tasdig'i: tugmani bosgan Telegram akkaunti aynan shu xodimniki bo'lishi shart. */
  async confirm(challengeId: string, telegramId: bigint): Promise<boolean> {
    const userId = await this.redis.get(pendingKey(challengeId));
    if (!userId) return false;
    const user = await this.staff.byId(userId);
    if (!user || user.telegramId !== telegramId) return false;
    const ttl = await this.redis.ttl(pendingKey(challengeId));
    await this.redis.set(confirmedKey(challengeId), userId, 'EX', Math.max(ttl, 1));
    await this.redis.del(pendingKey(challengeId));
    return true;
  }

  /** Tasdiqlangan bo'lsa — sessiya (bir marta: GETDEL). Aks holda 202 "kutilmoqda". */
  async poll(challengeId: string, meta: ClientMeta, ctx: AuditContext): Promise<Issued> {
    const userId = await this.redis.getdel(confirmedKey(challengeId));
    if (!userId) {
      const pending = (await this.redis.exists(pendingKey(challengeId))) === 1;
      throw pending
        ? new AppException(HttpStatus.ACCEPTED, 'TELEGRAM_LOGIN_PENDING')
        : new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_MFA_TOKEN');
    }
    const user = await this.staff.byId(userId);
    if (!user || user.status !== 'active') {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_MFA_TOKEN');
    }
    return this.auth.issue(user, { meta, ctx, method: 'telegram' });
  }
}
