import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module.js';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter.js';
import { createFastifyLoggerOptions } from './common/logger/logger.config.js';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe.js';
import { EnvService } from './config/env.service.js';
import { setupOpenApi } from './openapi.js';

export async function createApp(): Promise<{
  app: NestFastifyApplication;
  env: EnvService;
}> {
  const env = new EnvService();
  const fastifyOptions = createFastifyLoggerOptions(env);
  const adapter = new FastifyAdapter(fastifyOptions);

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter, {
    bufferLogs: true,
  });

  app.enableShutdownHooks();

  const corsOrigins = env
    .get('CORS_ORIGINS')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());

  setupOpenApi(app, env);

  return { app, env };
}
