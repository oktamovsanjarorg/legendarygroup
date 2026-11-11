import type { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

/**
 * Worker ilovasi (apps/worker) uchun NestJS kontekstini ishga tushiradi.
 * HTTP server tinglamaydi, faqat DI konteynerini (DB, Redis, Config, Servislar) yuklaydi.
 */
export async function bootstrapWorker(): Promise<INestApplicationContext> {
  const appContext = await NestFactory.createApplicationContext(AppModule, {
    bufferLogs: true,
  });
  appContext.enableShutdownHooks();
  return appContext;
}
