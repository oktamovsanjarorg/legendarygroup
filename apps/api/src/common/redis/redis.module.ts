import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { Redis } from 'ioredis';
import { EnvService } from '../../config/env.service.js';
import { REDIS_TOKEN } from './redis.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_TOKEN,
      inject: [EnvService],
      useFactory: (env: EnvService): Redis => {
        return new Redis(env.get('REDIS_URL'), {
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });
      },
    },
  ],
  exports: [REDIS_TOKEN],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_TOKEN) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    try {
      await this.redis.quit();
    } catch {
      this.redis.disconnect();
    }
  }
}
