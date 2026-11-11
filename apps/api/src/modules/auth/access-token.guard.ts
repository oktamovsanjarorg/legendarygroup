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
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import { SessionsService } from './sessions.service.js';
import { type AccessClaims, TokensService } from './tokens.service.js';

export interface RequestUser {
  id: string;
  role: RoleCode;
  /** Web sessiyasi; Mini App'da `null`. */
  sessionId: string | null;
  /** `permissions_version` — ruxsatlar keshi kaliti. */
  pv: number;
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
    if (!claims || !(await this.isValid(claims))) {
      throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
    }
    request.user = { id: claims.sub, role: claims.role, sessionId: claims.sid, pv: claims.pv };
    return true;
  }

  /** Web — sessiya bo'yicha; Mini App (sessiyasiz) — foydalanuvchi va rol bo'yicha. */
  private isValid(c: AccessClaims): Promise<boolean> {
    return c.sid
      ? this.sessions.isAccessValid(c.sid, c.sub, c.pv, c.role)
      : this.sessions.isUserAccessValid(c.sub, c.pv, c.role);
  }
}

/** `@CurrentUser() user: RequestUser` — guard'dan o'tgan foydalanuvchi. */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const user = ctx.switchToHttp().getRequest<AuthedRequest>().user;
  if (!user) throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
  return user;
});

export { auditContext, clientMeta } from '../../common/audit/request-context.js';
