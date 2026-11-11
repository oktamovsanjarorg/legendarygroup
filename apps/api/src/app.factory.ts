import fastifyCookie from '@fastify/cookie';
import { RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule, type AppModuleOptions } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { createFastifyOptions, createNestLogger } from './common/logger/logger.config.js';
import { EnvService } from './config/env.service.js';
import { setupOpenApi } from './openapi.js';

/** Tashqi marshrutlar `/api/*` (06 §1). `/internal/*` prefiksiz — Caddy uni tashqariga chiqarmaydi. */
export const API_PREFIX = 'api';

export async function createApp(
  env: EnvService = new EnvService(process.env),
  extra: AppModuleOptions['extra'] = [],
): Promise<{ app: NestFastifyApplication; env: EnvService }> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(env, { role: 'api', extra }),
    new FastifyAdapter(createFastifyOptions(env)),
    { logger: createNestLogger(env), abortOnError: false },
  );

  await app.register(fastifyCookie);
  // Bot fayllari (`/internal/files`) — xom bayt; hajm chegarasi maqsad bo'yicha tekshiriladi.
  app
    .getHttpAdapter()
    .getInstance()
    .addContentTypeParser(
      'application/octet-stream',
      { parseAs: 'buffer', bodyLimit: 11 * 1024 * 1024 },
      (_req, body, done) => {
        done(null, body);
      },
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
