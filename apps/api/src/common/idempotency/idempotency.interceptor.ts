import { createHash } from 'node:crypto';
import {
  type CallHandler,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  type NestInterceptor,
} from '@nestjs/common';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import type { Clock } from '@lg/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { catchError, concatMap, from, type Observable, of, throwError } from 'rxjs';
import { CLOCK_TOKEN } from '../clock/clock.tokens.js';
import { AppException } from '../errors/app.exception.js';
import {
  type IdempotencyScope,
  IdempotencyStore,
  type StoredResponse,
} from './idempotency.store.js';

export const IDEMPOTENCY_HEADER = 'idempotency-key';
const TTL_MS = 24 * 60 * 60 * 1000; // 05-data-model.md
const STALE_MS = 5 * 60 * 1000; // jarayon o'lib qolsa — 5 daqiqadan keyin qayta urinish mumkin
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const VALID_KEY = /^[\x21-\x7E]{1,128}$/;

/** Kalitlar tartibidan qat'i nazar bir xil JSON → bir xil hash. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * `Idempotency-Key` (03 §5.2, CLAUDE.md "Idempotentlik"):
 * 1) kalit handler'dan OLDIN atomar band qilinadi — parallel ikkinchi so'rov 409 oladi;
 * 2) tugagach javob saqlanadi va 24 soat davomida qaytariladi (`Idempotent-Replay: true`);
 * 3) boshqa body bilan shu kalit — 422; handler xatosi — band bekor qilinadi.
 * Kalit (key, route, foydalanuvchi) bo'yicha — begona javob qaytmaydi.
 * Pul amallari bundan tashqari DB'da o'z unique kaliti bilan himoyalanadi (payments.idempotency_key).
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  private readonly logger = new Logger(IdempotencyInterceptor.name);

  constructor(
    @Inject(IdempotencyStore) private readonly store: IdempotencyStore,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const rawKey = request.headers[IDEMPOTENCY_HEADER];
    if (!MUTATING.has(request.method) || rawKey === undefined) return next.handle();
    if (typeof rawKey !== 'string' || !VALID_KEY.test(rawKey)) {
      throw new AppException(HttpStatus.BAD_REQUEST, 'INVALID_IDEMPOTENCY_KEY');
    }

    const scope: IdempotencyScope = {
      key: rawKey,
      route: routeOf(request),
      userId: userIdOf(request),
    };
    const requestHash = createHash('sha256')
      .update(stableStringify(request.body ?? null))
      .digest('hex');
    const now = this.clock.now();
    const claimed = await this.store.claim(scope, {
      requestHash,
      now,
      expiresAt: new Date(now.getTime() + TTL_MS),
      staleBefore: new Date(now.getTime() - STALE_MS),
    });
    if (!claimed) return this.replay(await this.store.find(scope), requestHash, http.getResponse());

    const status = successStatus(context, request.method);
    return next.handle().pipe(
      concatMap((body) => from(this.complete(scope, status, body))),
      catchError((err: unknown) =>
        from(this.store.release(scope)).pipe(concatMap(() => throwError(() => err))),
      ),
    );
  }

  private replay(stored: StoredResponse | undefined, requestHash: string, reply: FastifyReply) {
    if (stored && stored.requestHash !== requestHash) {
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'IDEMPOTENCY_CONFLICT');
    }
    if (!stored || stored.responseStatus === null) {
      void reply.header('Retry-After', '2');
      throw new AppException(HttpStatus.CONFLICT, 'IDEMPOTENCY_IN_PROGRESS');
    }
    void reply.header('Idempotent-Replay', 'true');
    return of(stored.responseBody);
  }

  private async complete(scope: IdempotencyScope, status: number, body: unknown): Promise<unknown> {
    try {
      await this.store.complete(scope, status, body);
    } catch (err) {
      // Amal bajarildi, javob mijozga ketadi; kalit 5 daqiqadan keyin qayta egallanishi mumkin.
      this.logger.error({ err, route: scope.route }, 'Idempotency natijasi saqlanmadi');
    }
    return body;
  }
}

const routeOf = (request: FastifyRequest): string =>
  `${request.method} ${request.url.split('?')[0]}`;

/** T-006 dan keyin auth guard `request.user`ni to'ldiradi; hozircha anonim (null). */
const userIdOf = (request: FastifyRequest): string | null => {
  const user = (request as FastifyRequest & { user?: { id?: unknown } }).user;
  return typeof user?.id === 'string' ? user.id : null;
};

/** NestJS statusni interceptor'dan KEYIN qo'yadi — shuning uchun metadata'dan olinadi. */
const successStatus = (context: ExecutionContext, method: string): number =>
  (Reflect.getMetadata(HTTP_CODE_METADATA, context.getHandler()) as number | undefined) ??
  (method === 'POST' ? HttpStatus.CREATED : HttpStatus.OK);
