import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { createFastifyOptions, createNestLogger } from './common/logger/logger.config.js';
import { EnvService } from './config/env.service.js';
import { setupOpenApi } from './openapi.js';

/** Tashqi marshrutlar `/api/*` (06 §1). `/internal/*` prefiksiz — Caddy uni tashqariga chiqarmaydi. */
export const API_PREFIX = 'api';

export async function createApp(
  env: EnvService = new EnvService(process.env),
): Promise<{ app: NestFastifyApplication; env: EnvService }> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(env),
    new FastifyAdapter(createFastifyOptions(env)),
    { logger: createNestLogger(env), abortOnError: false },
  );

  app.setGlobalPrefix(API_PREFIX, {
    exclude: [{ path: 'internal/*path', method: RequestMethod.ALL }],
  });
  app.enableShutdownHooks();
  app.enableCors({ origin: env.get('CORS_ORIGINS'), credentials: true });
  app.useGlobalFilters(new GlobalExceptionFilter());
  // Validatsiya global emas: har endpoint `@ZodBody`/`@ZodQuery` bilan o'z sxemasini beradi.
  if (env.docsEnabled) setupOpenApi(app);

  return { app, env };
}
