import {
  type CanActivate,
  type ExecutionContext,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Permission } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { AUTHENTICATED_KEY, PERMISSIONS_KEY } from '../../common/decorators/access.decorators.js';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { PermissionsService } from './permissions.service.js';

/**
 * RBAC qatlami (02 §1). `AccessTokenGuard`dan keyin ishlaydi. Deny by default:
 * `@Public`/`@Authenticated`/`@RequirePermission` dan biri bo'lmagan endpoint — 403
 * (CI testi bunday endpoint'ni build bosqichida ushlaydi: `access.int.test.ts`).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name);

  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(PermissionsService) private readonly permissions: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const user = context.switchToHttp().getRequest<FastifyRequest & { user?: RequestUser }>().user;
    if (!user) throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');

    const required = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      targets,
    );
    if (!required) {
      if (this.reflector.getAllAndOverride<boolean>(AUTHENTICATED_KEY, targets)) return true;
      this.logger.error(
        `Ruxsat dekoratori yo'q: ${context.getClass().name}.${context.getHandler().name}`,
      );
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    }
    const granted = await this.permissions.forUser(user.id, user.role, user.pv);
    if (!required.every((p) => granted.has(p)))
      throw new AppException(HttpStatus.FORBIDDEN, 'FORBIDDEN');
    return true;
  }
}
