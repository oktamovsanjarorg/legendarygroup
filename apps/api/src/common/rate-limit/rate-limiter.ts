import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { AppException } from '../errors/app.exception.js';
import { REDIS_TOKEN } from '../redis/redis.tokens.js';

export interface RateLimit {
  /** Kalit maqsadi, masalan `login:phone`. */
  scope: string;
  limit: number;
  windowS: number;
}

/**
 * Redis "fixed window" hisoblagich (07 §3: login 5/daq ...). Limitdan oshsa —
 * 429 `TOO_MANY_REQUESTS` va `retryAfter` (soniya).
 */
@Injectable()
export class RateLimiter {
  constructor(@Inject(REDIS_TOKEN) private readonly redis: Redis) {}

  async hit(rule: RateLimit, subject: string): Promise<void> {
    const key = `rl:${rule.scope}:${subject}`;
    const [[, count], [, ttl]] = (await this.redis.multi().incr(key).ttl(key).exec()) as [
      [unknown, number],
      [unknown, number],
    ];
    if (ttl < 0) await this.redis.expire(key, rule.windowS);
    if (count > rule.limit) {
      throw new AppException(HttpStatus.TOO_MANY_REQUESTS, 'TOO_MANY_REQUESTS', {
        retryAfter: ttl > 0 ? ttl : rule.windowS,
      });
    }
  }

  /** Muvaffaqiyatli kirishdan keyin hisoblagichni tozalash. */
  async reset(rule: RateLimit, subject: string): Promise<void> {
    await this.redis.del(`rl:${rule.scope}:${subject}`);
  }
}
