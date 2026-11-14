import {
  type CallHandler,
  type ExecutionContext,
  Inject,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { concatMap, from, type Observable } from 'rxjs';
import { AUDIT_KEY, type AuditMeta } from './audit.decorator.js';
import { AuditService } from './audit.service.js';
import { auditContext } from './request-context.js';

/** Audit'ga hech qachon tushmaydigan kalitlar (CLAUDE.md "Sirlar ... logda yo'q"). */
const SECRET_KEYS =
  /^(password|passwordHash|token|accessToken|refreshToken|mfaToken|secret|totpSecret|otpauthUrl|code|backupCode|backupCodes)$/i;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 5 || value === null || typeof value !== 'object') {
    return typeof value === 'bigint' ? value.toString() : value;
  }
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([k, v]) => [
      k,
      SECRET_KEYS.test(k) ? '[yashirilgan]' : redact(v, depth + 1),
    ]),
  );
}

const idOf = (req: FastifyRequest, body: unknown): string | null => {
  const param = (req.params as Record<string, string> | undefined)?.['id'];
  if (param) return param;
  const id = body && typeof body === 'object' ? (body as { id?: unknown }).id : undefined;
  return typeof id === 'string' ? id : null;
};

/** `@Audit()` endpoint'lari uchun global interceptor (T-008). */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, context.getHandler());
    if (!meta) return next.handle();
    const req = context.switchToHttp().getRequest<FastifyRequest>();
    return next.handle().pipe(
      concatMap((body) =>
        from(
          this.audit
            .record(auditContext(req), {
              action: meta.action,
              entity: meta.entity,
              entityId: idOf(req, body),
              after:
                body && typeof body === 'object' ? (redact(body) as Record<string, unknown>) : null,
            })
            .then(() => body),
        ),
      ),
    );
  }
}
