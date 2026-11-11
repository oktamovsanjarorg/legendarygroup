import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { EnvService } from './config/env.service.js';

/**
 * `apps/worker` uchun — xuddi shu modullar, HTTP serversiz (03 §3).
 * T-005 navbat iste'molchilarini shu kontekstga qo'shadi.
 */
export async function bootstrapWorker(
  env: EnvService = new EnvService(process.env),
): Promise<INestApplicationContext> {
  const context = await NestFactory.createApplicationContext(AppModule.forRoot(env), {
    bufferLogs: true,
    abortOnError: false,
  });
  context.enableShutdownHooks();
  return context;
}
