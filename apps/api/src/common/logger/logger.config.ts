import { randomUUID } from 'node:crypto';
import type { FastifyServerOptions } from 'fastify';
import type { EnvService } from '../../config/env.service.js';

export function createFastifyLoggerOptions(env: EnvService): FastifyServerOptions {
  const isProd = env.isProduction;
  const level = env.get('LOG_LEVEL');

  return {
    requestIdHeader: 'x-request-id',
    genReqId: (req) => {
      const existing = req.headers['x-request-id'];
      if (typeof existing === 'string' && existing.length > 0) {
        return existing;
      }
      return randomUUID();
    },
    logger: isProd
      ? { level }
      : {
          level,
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              singleLine: true,
              translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
            },
          },
        },
  };
}
