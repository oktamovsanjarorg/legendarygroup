import { createHash, timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { EnvService } from '../../config/env.service.js';
import { AppException } from '../errors/app.exception.js';

export const INTERNAL_TOKEN_HEADER = 'x-internal-token';

const digest = (s: string): Buffer => createHash('sha256').update(s).digest();

/**
 * `/internal/*` — faqat bot va boshqa ichki servislar (03 §2). Faqat `X-Internal-Token`:
 * `Authorization: Bearer` foydalanuvchi JWT'lari uchun band (T-006), aralashtirilmaydi.
 * Hash orqali solishtirish — vaqt ham, uzunlik ham oshkor bo'lmaydi.
 */
@Injectable()
export class InternalTokenGuard implements CanActivate {
  private readonly expected: Buffer;

  constructor(@Inject(EnvService) env: EnvService) {
    this.expected = digest(env.get('INTERNAL_API_TOKEN'));
  }

  canActivate(context: ExecutionContext): boolean {
    const token = context.switchToHttp().getRequest<FastifyRequest>().headers[
      INTERNAL_TOKEN_HEADER
    ];
    if (typeof token !== 'string' || !timingSafeEqual(digest(token), this.expected)) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'INVALID_INTERNAL_TOKEN');
    }
    return true;
  }
}
