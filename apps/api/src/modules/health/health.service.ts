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

  async getMetrics(): Promise<string> {
    const mem = process.memoryUsage();
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const counts = await this.getBusinessCounts(dbOk);

    return (
      [
        '# HELP process_uptime_seconds Process uptime in seconds.',
        '# TYPE process_uptime_seconds gauge',
        `process_uptime_seconds ${process.uptime().toFixed(2)}`,
        '# HELP process_heap_used_bytes Process heap used.',
        '# TYPE process_heap_used_bytes gauge',
        `process_heap_used_bytes ${mem.heapUsed}`,
        '# HELP process_heap_total_bytes Process heap total.',
        '# TYPE process_heap_total_bytes gauge',
        `process_heap_total_bytes ${mem.heapTotal}`,
        '# HELP process_rss_bytes Process RSS in bytes.',
        '# TYPE process_rss_bytes gauge',
        `process_rss_bytes ${mem.rss}`,
        '# HELP service_database_up Database status (1=up, 0=down).',
        '# TYPE service_database_up gauge',
        `service_database_up ${dbOk ? 1 : 0}`,
        '# HELP service_redis_up Redis status (1=up, 0=down).',
        '# TYPE service_redis_up gauge',
        `service_redis_up ${redisOk ? 1 : 0}`,
        '# HELP business_pending_submissions Pending payment submissions.',
        '# TYPE business_pending_submissions gauge',
        `business_pending_submissions ${counts.pendingSubs}`,
        '# HELP business_pending_guardians Pending guardian link requests.',
        '# TYPE business_pending_guardians gauge',
        `business_pending_guardians ${counts.pendingLinks}`,
      ].join('\n') + '\n'
    );
  }

  private async getBusinessCounts(
    dbOk: boolean,
  ): Promise<{ pendingSubs: number; pendingLinks: number }> {
    if (!dbOk) return { pendingSubs: 0, pendingLinks: 0 };
    try {
      const [sRes, lRes] = await Promise.all([
        this.db.execute(
          sql`SELECT count(*)::int as c FROM payment_submissions WHERE status = 'pending'`,
        ),
        this.db.execute(
          sql`SELECT count(*)::int as c FROM guardian_link_requests WHERE status = 'pending'`,
        ),
      ]);
      return {
        pendingSubs: Number((sRes[0] as { c?: number })?.c ?? 0),
        pendingLinks: Number((lRes[0] as { c?: number })?.c ?? 0),
      };
    } catch {
      return { pendingSubs: 0, pendingLinks: 0 };
    }
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
