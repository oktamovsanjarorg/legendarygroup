import { timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { EnvService } from '../../config/env.service.js';

@Injectable()
export class InternalTokenGuard implements CanActivate {
  constructor(@Inject(EnvService) private readonly env: EnvService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException({
        code: 'MISSING_INTERNAL_TOKEN',
        message: 'Ichki API tokeni taqdim etilmagan',
      });
    }

    const expectedToken = this.env.get('INTERNAL_API_TOKEN');
    if (!this.secureCompare(token, expectedToken)) {
      throw new UnauthorizedException({
        code: 'INVALID_INTERNAL_TOKEN',
        message: 'Ichki API tokeni notoʻgʻri',
      });
    }

    return true;
  }

  private extractToken(request: FastifyRequest): string | undefined {
    const headerToken = request.headers['x-internal-token'];
    if (typeof headerToken === 'string' && headerToken.length > 0) {
      return headerToken;
    }

    const authHeader = request.headers.authorization;
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    return undefined;
  }

  private secureCompare(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) {
      return false;
    }
    return timingSafeEqual(bufA, bufB);
  }
}
