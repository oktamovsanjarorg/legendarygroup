import type { ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { testEnv } from '../../test/env.js';
import { AppException } from '../errors/app.exception.js';
import { InternalTokenGuard } from './internal-token.guard.js';

const env = testEnv();
const guard = new InternalTokenGuard(env);
const ctx = (headers: Record<string, string>) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ headers }) }) }) as unknown as ExecutionContext;

const codeOf = (fn: () => unknown): string | undefined => {
  try {
    fn();
  } catch (e) {
    return e instanceof AppException ? e.code : 'OTHER';
  }
  return undefined;
};

describe('InternalTokenGuard (T-004, 03 §2)', () => {
  it("to'g'ri X-Internal-Token o'tadi", () => {
    expect(guard.canActivate(ctx({ 'x-internal-token': env.get('INTERNAL_API_TOKEN') }))).toBe(
      true,
    );
  });

  it.each([
    ["token yo'q", {}],
    ["noto'g'ri token", { 'x-internal-token': 'wrong' }],
    [
      'Bearer qabul qilinmaydi (JWT uchun band)',
      { authorization: `Bearer ${env.get('INTERNAL_API_TOKEN')}` },
    ],
  ])('%s → INVALID_INTERNAL_TOKEN', (_name, headers) => {
    expect(codeOf(() => guard.canActivate(ctx(headers)))).toBe('INVALID_INTERNAL_TOKEN');
  });
});
