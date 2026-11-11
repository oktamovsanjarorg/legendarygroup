import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, type AppModuleOptions } from './app.module.js';
import { createNestLogger } from './common/logger/logger.config.js';
import { EnvService } from './config/env.service.js';

/**
 * `apps/worker` uchun — xuddi shu modullar, HTTP serversiz (03 §3).
 * T-005 navbat iste'molchilarini shu kontekstga qo'shadi.
 */
export async function bootstrapWorker(
  env: EnvService = new EnvService(process.env),
  extra: AppModuleOptions['extra'] = [],
): Promise<INestApplicationContext> {
  const context = await NestFactory.createApplicationContext(
    AppModule.forRoot(env, { role: 'worker', extra }),
    {
      logger: createNestLogger(env),
      abortOnError: false,
    },
  );
  context.enableShutdownHooks();
  return context;
}
