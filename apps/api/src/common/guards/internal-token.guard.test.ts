import { describe, expect, it } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { EnvService } from '../../config/env.service.js';
import { InternalTokenGuard } from './internal-token.guard.js';

describe('InternalTokenGuard (T-004 AC)', () => {
  const secret = 'valid_internal_secret_token_12345';
  const env = new EnvService({
    DATABASE_URL: 'postgres://localhost:5434/db',
    REDIS_URL: 'redis://localhost:6380',
    INTERNAL_API_TOKEN: secret,
  });

  function makeContext(headers: Record<string, string>): ExecutionContext {
    const request = { headers } as unknown as FastifyRequest;
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  it('token boʻlmasa MISSING_INTERNAL_TOKEN tashlaydi', () => {
    const guard = new InternalTokenGuard(env);
    try {
      guard.canActivate(makeContext({}));
      expect.fail('Xato tashlanishi kerak edi');
    } catch (err: unknown) {
      const response = (err as { getResponse?: () => { code: string } }).getResponse?.();
      expect(response?.code).toBe('MISSING_INTERNAL_TOKEN');
    }
  });

  it('notoʻgʻri token boʻlsa INVALID_INTERNAL_TOKEN tashlaydi', () => {
    const guard = new InternalTokenGuard(env);
    try {
      guard.canActivate(makeContext({ 'x-internal-token': 'wrong-token-value' }));
      expect.fail('Xato tashlanishi kerak edi');
    } catch (err: unknown) {
      const response = (err as { getResponse?: () => { code: string } }).getResponse?.();
      expect(response?.code).toBe('INVALID_INTERNAL_TOKEN');
    }
  });

  it('x-internal-token orqali toʻgʻri token oʻtadi', () => {
    const guard = new InternalTokenGuard(env);
    const result = guard.canActivate(makeContext({ 'x-internal-token': secret }));
    expect(result).toBe(true);
  });

  it('Bearer header orqali toʻgʻri token oʻtadi', () => {
    const guard = new InternalTokenGuard(env);
    const result = guard.canActivate(makeContext({ authorization: `Bearer ${secret}` }));
    expect(result).toBe(true);
  });
});
