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
