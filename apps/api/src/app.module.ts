import { type DynamicModule, Module, type Type } from '@nestjs/common';
import { ClockModule } from './common/clock/clock.module.js';
import { DbModule } from './common/db/db.module.js';
import { IdempotencyModule } from './common/idempotency/idempotency.module.js';
import { QueueModule } from './common/queue/queue.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { SchedulerModule } from './common/scheduler/scheduler.module.js';
import { ConfigModule } from './config/config.module.js';
import type { EnvService } from './config/env.service.js';
import { HealthModule } from './modules/health/health.module.js';
import { InternalModule } from './modules/internal/internal.module.js';
import { OutboxModule } from './modules/outbox/outbox.module.js';
import { WorkerModule } from './worker/worker.module.js';

export interface AppModuleOptions {
  /** `worker` — relay, iste'molchilar, cron va Bull Board ham yuklanadi. */
  role: 'api' | 'worker';
  /** Qo'shimcha modullar (testlarda — handler/cron ro'yxatdan o'tkazuvchi test modullari). */
  extra?: (Type | DynamicModule)[];
}

@Module({})
export class AppModule {
  static forRoot(env: EnvService, opts: AppModuleOptions = { role: 'api' }): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        ClockModule,
        DbModule,
        RedisModule,
        QueueModule,
        SchedulerModule,
        OutboxModule,
        IdempotencyModule,
        HealthModule,
        InternalModule,
        ...(opts.role === 'worker' ? [WorkerModule] : []),
        ...(opts.extra ?? []),
      ],
    };
  }
}
