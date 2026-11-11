import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { IdempotencyInterceptor } from './idempotency.interceptor.js';
import { IdempotencyStore } from './idempotency.store.js';

/** Global `Idempotency-Key` interceptor'i (DB va Clock global modullardan). */
@Module({
  providers: [IdempotencyStore, { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor }],
})
export class IdempotencyModule {}
