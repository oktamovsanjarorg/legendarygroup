import { Inject, Injectable } from '@nestjs/common';
import type { Clock } from '@lg/domain';
import type { Redis } from 'ioredis';
import { uuidv7 } from 'uuidv7';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';
import { OutboxService } from '../outbox/index.js';

export const CHALLENGE_TTL_S = 300; // 5 daqiqa (T-006 Aniqlik)
export const pendingKey = (id: string) => `auth:tg:pending:${id}`;
export const confirmedKey = (id: string) => `auth:tg:ok:${id}`;

/**
 * Telegram tasdiq so'rovi (ADR 0006 §6): Redis'da challenge → foydalanuvchi; `userId` bo'lsa —
 * botga «Tasdiqlash» xabari (`StaffTelegramLoginRequested`). `null` — noma'lum telefon: challenge
 * baribir qaytadi (foydalanuvchi mavjudligi oshkor bo'lmaydi), lekin hech qachon tasdiqlanmaydi.
 * Ishlatuvchilar: "Telegram orqali kirish" (telefon) va parol → MFA bosqichi (T-122).
 */
@Injectable()
export class TelegramChallenges {
  constructor(
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(OutboxService) private readonly outbox: OutboxService,
  ) {}

  async create(userId: string | null): Promise<{ challengeId: string; expiresAt: string }> {
    const challengeId = uuidv7();
    const expiresAt = new Date(this.clock.now().getTime() + CHALLENGE_TTL_S * 1000).toISOString();
    await this.redis.set(pendingKey(challengeId), userId ?? '', 'EX', CHALLENGE_TTL_S);
    if (userId)
      await this.outbox.publish('StaffTelegramLoginRequested', { challengeId, userId, expiresAt });
    return { challengeId, expiresAt };
  }
}
