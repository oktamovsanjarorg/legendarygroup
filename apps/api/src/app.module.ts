import { type DynamicModule, Module } from '@nestjs/common';
import { ClockModule } from './common/clock/clock.module.js';
import { DbModule } from './common/db/db.module.js';
import { IdempotencyModule } from './common/idempotency/idempotency.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { ConfigModule } from './config/config.module.js';
import type { EnvService } from './config/env.service.js';
import { HealthModule } from './modules/health/health.module.js';
import { InternalModule } from './modules/internal/internal.module.js';

@Module({})
export class AppModule {
  static forRoot(env: EnvService): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule.forRoot(env),
        ClockModule,
        DbModule,
        RedisModule,
        IdempotencyModule,
        HealthModule,
        InternalModule,
      ],
    };
  }
}
