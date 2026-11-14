import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import type { Database } from '@lg/db';
import { closeDb, createDb } from '@lg/db';
import { EnvService } from '../../config/env.service.js';
import { DB_TOKEN } from './db.tokens.js';

@Global()
@Module({
  providers: [
    {
      provide: DB_TOKEN,
      inject: [EnvService],
      useFactory: (env: EnvService): Database => {
        const url = env.get('DATABASE_URL');
        return createDb(url, { appName: 'lg-api', max: 10 });
      },
    },
  ],
  exports: [DB_TOKEN],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  async onApplicationShutdown(): Promise<void> {
    await closeDb(this.db);
  }
}
