import { describe, expect, it, vi } from 'vitest';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z, type ZodError } from 'zod';
import { GlobalExceptionFilter } from './http-exception.filter.js';

describe('GlobalExceptionFilter (T-004 AC)', () => {
  function makeMockHost(reqId = 'req-123') {
    let sentStatus = 0;
    let sentBody: unknown;

    const reply = {
      status: vi.fn((s: number) => {
        sentStatus = s;
        return reply;
      }),
      send: vi.fn((b: unknown) => {
        sentBody = b;
        return reply;
      }),
    } as unknown as FastifyReply;

    const request = {
      id: reqId,
      headers: {},
      method: 'GET',
      url: '/test',
    } as unknown as FastifyRequest;

    const host = {
      switchToHttp: () => ({
        getResponse: () => reply,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    return { host, getResult: () => ({ status: sentStatus, body: sentBody }) };
  }

  it('HttpException uchun standart formatda xato qaytaradi', () => {
    const filter = new GlobalExceptionFilter();
    const { host, getResult } = makeMockHost('req-test-1');

    filter.catch(new NotFoundException('Resurs topilmadi'), host);

    const { status, body } = getResult();
    expect(status).toBe(404);
    expect(body).toEqual({
      code: 'NOT_FOUND',
      message: 'Resurs topilmadi',
      details: undefined,
      requestId: 'req-test-1',
    });
  });

  it('ZodError uchun 400 va VALIDATION_ERROR qaytaradi', () => {
    const filter = new GlobalExceptionFilter();
    const { host, getResult } = makeMockHost('req-test-2');

    const schema = z.object({ email: z.string().email() });
    const parsed = schema.safeParse({ email: 'not-an-email' });
    expect(parsed.success).toBe(false);

    filter.catch((parsed as { error: ZodError }).error, host);

    const { status, body } = getResult() as {
      status: number;
      body: { code: string; requestId: string };
    };
    expect(status).toBe(400);
    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.requestId).toBe('req-test-2');
  });

  it('Kutilmagan xato uchun 500 va INTERNAL_SERVER_ERROR qaytaradi', () => {
    const filter = new GlobalExceptionFilter();
    const { host, getResult } = makeMockHost('req-test-3');

    filter.catch(new Error('Kutilmagan xatolik'), host);

    const { status, body } = getResult();
    expect(status).toBe(500);
    expect(body).toEqual({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Kutilmagan server xatoligi yuz berdi',
      requestId: 'req-test-3',
    });
  });

  it('Custom code va details bor HttpException ni toʻgʻri oʻtkazadi', () => {
    const filter = new GlobalExceptionFilter();
    const { host, getResult } = makeMockHost('req-test-4');

    const exc = new UnauthorizedException({
      code: 'CUSTOM_AUTH_ERROR',
      message: 'Ruxsat berilmadi',
      details: { reason: 'expired' },
    });

    filter.catch(exc, host);

    const { status, body } = getResult();
    expect(status).toBe(401);
    expect(body).toEqual({
      code: 'CUSTOM_AUTH_ERROR',
      message: 'Ruxsat berilmadi',
      details: { reason: 'expired' },
      requestId: 'req-test-4',
    });
  });
});
