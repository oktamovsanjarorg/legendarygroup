import { createHash } from 'node:crypto';
import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { and, eq } from 'drizzle-orm';
import type { Observable } from 'rxjs';
import { of } from 'rxjs';
import { concatMap } from 'rxjs/operators';
import type { Database } from '@lg/db';
import { idempotencyKeys } from '@lg/db';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../clock/clock.tokens.js';
import { DB_TOKEN } from '../db/db.tokens.js';

const TTL_MS = 24 * 60 * 60 * 1000; // 24 soat (05-data-model.md)

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
    const http = context.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    const rawKey = request.headers['idempotency-key'];
    if (typeof rawKey !== 'string' || rawKey.trim().length === 0) {
      return next.handle();
    }

    const key = rawKey.trim();
    const route = this.resolveRoute(request);
    const requestHash = this.computeHash(request.body);
    const now = this.clock.now();

    const existing = await this.findKey(key, route);
    if (existing && existing.expiresAt > now) {
      return this.handleReplay(existing, requestHash, reply);
    }

    return next.handle().pipe(
      concatMap(async (responseBody) => {
        await this.saveKey({
          key,
          route,
          requestHash,
          responseStatus: reply.statusCode || 200,
          responseBody,
          userId: this.extractUserId(request),
          now,
        });
        return responseBody;
      }),
    );
  }

  private resolveRoute(request: FastifyRequest): string {
    const rawUrl = request.url.split('?')[0] ?? request.url;
    return `${request.method.toUpperCase()} ${rawUrl}`;
  }

  private computeHash(body: unknown): string {
    const payload = JSON.stringify(body ?? {});
    return createHash('sha256').update(payload).digest('hex');
  }

  private extractUserId(request: FastifyRequest): string | null {
    const maybeUser = (request as unknown as { user?: { id?: string } }).user;
    return typeof maybeUser?.id === 'string' ? maybeUser.id : null;
  }

  private async findKey(key: string, route: string) {
    const rows = await this.db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.key, key), eq(idempotencyKeys.route, route)))
      .limit(1);
    return rows[0];
  }

  private handleReplay(
    existing: { requestHash: string; responseStatus: number; responseBody: unknown },
    requestHash: string,
    reply: FastifyReply,
  ): Observable<unknown> {
    if (existing.requestHash !== requestHash) {
      throw new UnprocessableEntityException({
        code: 'IDEMPOTENCY_CONFLICT',
        message: 'Ushbu Idempotency-Key boshqa soʻrov maʼlumotlari bilan ishlatilgan',
      });
    }

    reply.status(existing.responseStatus);
    reply.header('Idempotent-Replay', 'true');
    return of(existing.responseBody);
  }

  private async saveKey(params: {
    key: string;
    route: string;
    requestHash: string;
    responseStatus: number;
    responseBody: unknown;
    userId: string | null;
    now: Date;
  }): Promise<void> {
    try {
      const expiresAt = new Date(params.now.getTime() + TTL_MS);
      await this.db
        .insert(idempotencyKeys)
        .values({
          key: params.key,
          route: params.route,
          requestHash: params.requestHash,
          responseStatus: params.responseStatus,
          responseBody: params.responseBody,
          userId: params.userId,
          createdAt: params.now,
          expiresAt,
        })
        .onConflictDoUpdate({
          target: [idempotencyKeys.key, idempotencyKeys.route],
          set: {
            requestHash: params.requestHash,
            responseStatus: params.responseStatus,
            responseBody: params.responseBody,
            userId: params.userId,
            createdAt: params.now,
            expiresAt,
          },
        });
    } catch {
      // Idempotency yozishdagi xatolik asosiy so'rov javobini buzmasligi kerak
    }
  }
}
