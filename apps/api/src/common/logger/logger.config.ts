import { ConsoleLogger, type LogLevel } from '@nestjs/common';
import type { FastifyServerOptions } from 'fastify';
import type { EnvService } from '../../config/env.service.js';
import { genRequestId } from './request-id.js';

/** Logga tushmasligi kerak bo'lgan maydonlar (sirlar, PII). */
const REDACT = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-internal-token"]',
  'req.headers["idempotency-key"]',
  'res.headers["set-cookie"]',
];

export function createFastifyOptions(env: EnvService): FastifyServerOptions {
  const level = env.get('LOG_LEVEL');
  const pretty = env.get('NODE_ENV') === 'development';

  return {
    genReqId: genRequestId,
    // Javobda ham shu ID — mijoz xatoni xabar qilganda ishlatadi.
    requestIdLogLabel: 'requestId',
    trustProxy: true,
    bodyLimit: 1024 * 1024,
    logger: {
      level,
      redact: { paths: REDACT, censor: '[yashirilgan]' },
      ...(pretty && {
        transport: { target: 'pino-pretty', options: { singleLine: true, colorize: true } },
      }),
    },
  };
}

const NEST_LEVELS: Record<string, LogLevel[]> = {
  fatal: ['fatal'],
  error: ['fatal', 'error'],
  warn: ['fatal', 'error', 'warn'],
  info: ['fatal', 'error', 'warn', 'log'],
  debug: ['fatal', 'error', 'warn', 'log', 'debug'],
  trace: ['fatal', 'error', 'warn', 'log', 'debug', 'verbose'],
  silent: [],
};

/**
 * Nest ilova logger'i: development'da o'qiladigan matn, boshqa muhitlarda JSON (06 §6: Loki).
 * `bufferLogs` ishlatilmaydi — ishga tushish xatolari va alert'lar yo'qolmasligi uchun.
 */
export function createNestLogger(env: EnvService): ConsoleLogger {
  return new ConsoleLogger({
    json: env.get('NODE_ENV') !== 'development',
    logLevels: NEST_LEVELS[env.get('LOG_LEVEL')] ?? NEST_LEVELS['info'],
  });
}
