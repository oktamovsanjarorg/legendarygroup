import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import type { Redis } from 'ioredis';
import type { Database } from '@lg/db';
import type { Clock } from '@lg/domain';
import { AppException, CLOCK_TOKEN, DB_TOKEN, REDIS_TOKEN } from '../../common/index.js';

/** Probe tez javob berishi kerak: bog'liq servis osilib qolsa — "down". */
const CHECK_TIMEOUT_MS = 2000;
const withTimeout = <T>(p: Promise<T>): Promise<T> =>
  Promise.race([
    p,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('timeout')), CHECK_TIMEOUT_MS).unref();
    }),
  ]);

export interface LivenessResult {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

export interface ReadinessResult {
  status: 'ok';
  checks: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  getLiveness(): LivenessResult {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: this.clock.now().toISOString(),
    };
  }

  async getReadiness(): Promise<ReadinessResult> {
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);

    const timestamp = this.clock.now().toISOString();

    if (!dbOk || !redisOk) {
      throw new AppException(HttpStatus.SERVICE_UNAVAILABLE, 'SERVICE_UNAVAILABLE', {
        database: dbOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      });
    }

    return {
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
      timestamp,
    };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await withTimeout(this.db.execute(sql`SELECT 1`));
      return true;
    } catch {
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const pong = await withTimeout(this.redis.ping());
      return pong === 'PONG';
    } catch {
      return false;
    }
  }
}
