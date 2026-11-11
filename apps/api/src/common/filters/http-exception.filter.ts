import {
  type ArgumentsHost,
  type ExceptionFilter,
  Catch,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}

interface HttpPayload {
  code?: string;
  message?: string | string[];
  details?: unknown;
  error?: string;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const reply = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const requestId = this.resolveRequestId(request);

    const { status, body } = this.buildErrorPayload(exception, requestId);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${requestId}] ${request.method} ${request.url} - ${status} Xatolik:`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    reply.status(status).send(body);
  }

  private resolveRequestId(request: FastifyRequest): string {
    const headerId = request.headers['x-request-id'];
    if (typeof headerId === 'string' && headerId.length > 0) {
      return headerId;
    }
    return request.id ?? 'unknown-req';
  }

  private buildErrorPayload(
    exception: unknown,
    requestId: string,
  ): { status: number; body: ApiErrorResponse } {
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          code: 'VALIDATION_ERROR',
          message: 'Kiritilgan maʼlumotlar yaroqsiz',
          details: exception.flatten().fieldErrors,
          requestId,
        },
      };
    }

    if (exception instanceof HttpException) {
      return this.fromHttpException(exception, requestId);
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Kutilmagan server xatoligi yuz berdi',
        requestId,
      },
    };
  }

  private fromHttpException(
    exception: HttpException,
    requestId: string,
  ): { status: number; body: ApiErrorResponse } {
    const status = exception.getStatus();
    const response = exception.getResponse();
    const isObject = typeof response === 'object' && response !== null;
    const payload = isObject ? (response as HttpPayload) : {};

    const code = payload.code ?? this.defaultCodeForStatus(status);
    const message = Array.isArray(payload.message)
      ? payload.message.join('; ')
      : (payload.message ?? exception.message);

    return {
      status,
      body: {
        code,
        message,
        details: payload.details,
        requestId,
      },
    };
  }

  private defaultCodeForStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'BAD_REQUEST';
      case HttpStatus.UNAUTHORIZED:
        return 'UNAUTHORIZED';
      case HttpStatus.FORBIDDEN:
        return 'FORBIDDEN';
      case HttpStatus.NOT_FOUND:
        return 'NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'CONFLICT';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'UNPROCESSABLE_ENTITY';
      default:
        return 'HTTP_ERROR';
    }
  }
}
