import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { RoleCode } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { AuditContext } from '../../common/audit/audit.service.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { ClientMeta } from './sessions.service.js';
import { SessionsService } from './sessions.service.js';
import { TokensService } from './tokens.service.js';

export interface RequestUser {
  id: string;
  role: RoleCode;
  sessionId: string;
}

type AuthedRequest = FastifyRequest & { user?: RequestUser };

/**
 * Global guard (deny by default): `@Public()` bo'lmagan har endpoint — `Authorization: Bearer`.
 * Har so'rovda sessiya, foydalanuvchi holati va `permissions_version` tekshiriladi — bloklash
 * va ruxsat o'zgarishi token muddatini kutmasdan kuchga kiradi (02 §1). T-008: kesh (Redis).
 */
@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(TokensService) private readonly tokens: TokensService,
    @Inject(SessionsService) private readonly sessions: SessionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<AuthedRequest>();
    const header = request.headers.authorization;
    const claims = header?.startsWith('Bearer ')
      ? await this.tokens.verifyAccess(header.slice(7))
      : null;
    if (!claims || !(await this.sessions.isAccessValid(claims.sid, claims.sub, claims.pv))) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
    }
    request.user = { id: claims.sub, role: claims.role, sessionId: claims.sid };
    return true;
  }
}

/** `@CurrentUser() user: RequestUser` — guard'dan o'tgan foydalanuvchi. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  return user;
});

export const clientMeta = (req: FastifyRequest): ClientMeta => ({
  ip: req.ip ?? null,
  device: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
});

export const auditContext = (req: FastifyRequest): AuditContext => {
  const user = (req as AuthedRequest).user;
  return {
    actorId: user?.id ?? null,
    actorRole: user?.role ?? null,
    ip: req.ip ?? null,
    userAgent: clientMeta(req).device,
    requestId: req.id,
  };
};
