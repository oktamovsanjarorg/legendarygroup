import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { type ErrorCode, errorMessages, isErrorCode } from '@lg/i18n';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/** Yagona xato formati (07-quality-security.md §2). */
export interface ApiErrorResponse {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}

const STATUS_CODES: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'UNPROCESSABLE_ENTITY',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'SERVICE_UNAVAILABLE',
};

interface Resolved {
  status: number;
  code: string;
  details?: unknown;
}

const codeOf = (payload: unknown): string | undefined =>
  typeof payload === 'object' && payload !== null && 'code' in payload
    ? String((payload as { code: unknown }).code)
    : undefined;

const detailsOf = (payload: unknown): unknown =>
  typeof payload === 'object' && payload !== null && 'details' in payload
    ? (payload as { details: unknown }).details
    : undefined;

/**
 * Foydalanuvchiga hech qachon ichki xato matni (Nest/Zod inglizcha xabarlari, stack) chiqmaydi:
 * `message` faqat `@lg/i18n`dan, kod bo'yicha.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<FastifyReply>();
    const request = http.getRequest<FastifyRequest>();
    const { status, code, details } = this.resolve(exception);

    if (status >= 500) {
      this.logger.error(
        { requestId: request.id, err: exception },
        `${request.method} ${request.url}`,
      );
    }

    const message = isErrorCode(code) ? errorMessages[code] : this.fallbackMessage(status, code);
    const body: ApiErrorResponse = { code, message, requestId: request.id };
    if (details !== undefined) body.details = details;
    void reply.status(status).send(body);
  }

  private resolve(exception: unknown): Resolved {
    if (exception instanceof ZodError) {
      return {
        status: HttpStatus.BAD_REQUEST,
        code: 'VALIDATION_ERROR',
        // Tilga bog'liq bo'lmagan tafsilot: UI maydonni belgilaydi, matnni o'zi i18n'dan oladi.
        details: exception.issues.map((i) => ({ path: i.path.join('.'), code: i.code })),
      };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const fallback =
        STATUS_CODES[status] ?? (status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR');
      return { status, code: codeOf(payload) ?? fallback, details: detailsOf(payload) };
    }
    return { status: HttpStatus.INTERNAL_SERVER_ERROR, code: 'INTERNAL_SERVER_ERROR' };
  }

  private fallbackMessage(status: number, code: string): string {
    this.logger.warn(`i18n'da xato kodi yo'q: ${code}`);
    return errorMessages[STATUS_CODES[status] ?? 'HTTP_ERROR'];
  }
}
