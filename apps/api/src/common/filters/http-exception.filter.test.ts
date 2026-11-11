import { ForbiddenException, HttpStatus, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { errorMessages } from '@lg/i18n';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AppException } from '../errors/app.exception.js';
import { GlobalExceptionFilter } from './http-exception.filter.js';

function run(exception: unknown) {
  const sent: { status?: number; body?: Record<string, unknown> } = {};
  const reply = {
    status: vi.fn((s: number) => ((sent.status = s), reply)),
    send: vi.fn((b: Record<string, unknown>) => ((sent.body = b), reply)),
  } as unknown as FastifyReply;
  const request = {
    id: 'req-1',
    method: 'GET',
    url: '/x',
    headers: {},
  } as unknown as FastifyRequest;
  const host = {
    switchToHttp: () => ({ getResponse: () => reply, getRequest: () => request }),
  } as unknown as ArgumentsHost;
  new GlobalExceptionFilter().catch(exception, host);
  return sent;
}

describe('GlobalExceptionFilter (T-004)', () => {
  it("Nest'ning inglizcha xabari foydalanuvchiga chiqmaydi — i18n matni", () => {
    const { status, body } = run(new NotFoundException('Cannot GET /secret-internal-path'));
    expect(status).toBe(404);
    expect(body).toEqual({
      code: 'NOT_FOUND',
      message: errorMessages.NOT_FOUND,
      requestId: 'req-1',
    });
  });

  it('AppException: kod, tafsilot va i18n matni', () => {
    const { status, body } = run(
      new AppException(HttpStatus.CONFLICT, 'IDEMPOTENCY_IN_PROGRESS', { retryAfter: 2 }),
    );
    expect(status).toBe(409);
    expect(body).toEqual({
      code: 'IDEMPOTENCY_IN_PROGRESS',
      message: errorMessages.IDEMPOTENCY_IN_PROGRESS,
      details: { retryAfter: 2 },
      requestId: 'req-1',
    });
  });

  it("ZodError → 400 VALIDATION_ERROR, tafsilot tilga bog'liq emas", () => {
    const parsed = z.object({ phone: z.string().min(5) }).safeParse({ phone: '1' });
    if (parsed.success) throw new Error('kutilmagan');
    const { status, body } = run(parsed.error);
    expect(status).toBe(400);
    expect(body?.['code']).toBe('VALIDATION_ERROR');
    expect(body?.['details']).toEqual([{ path: 'phone', code: 'too_small' }]);
  });

  it('kutilmagan xato → 500, ichki matn/stack chiqmaydi', () => {
    const { status, body } = run(new Error('DB parol: secret123'));
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain('secret123');
    expect(body?.['code']).toBe('INTERNAL_SERVER_ERROR');
  });

  it("katalogda yo'q kod — kod saqlanadi, matn status bo'yicha", () => {
    const { body } = run(new ForbiddenException({ code: 'SOME_NEW_CODE' }));
    expect(body?.['code']).toBe('SOME_NEW_CODE');
    expect(body?.['message']).toBe(errorMessages.FORBIDDEN);
  });
});
