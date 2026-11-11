import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule } from './config/config.module.js';
import { ClockModule } from './common/clock/clock.module.js';
import { DbModule } from './common/db/db.module.js';
import { RedisModule } from './common/redis/redis.module.js';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor.js';
import { HealthModule } from './modules/health/health.module.js';
import { InternalModule } from './modules/internal/internal.module.js';

@Module({
  imports: [ConfigModule, ClockModule, DbModule, RedisModule, HealthModule, InternalModule],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: IdempotencyInterceptor,
    },
  ],
})
export class AppModule {}
