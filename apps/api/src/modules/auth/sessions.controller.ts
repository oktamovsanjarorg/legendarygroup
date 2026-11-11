import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuthUser, type SessionInfo, SwitchRoleRequest } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { AuditService } from '../../common/audit/audit.service.js';
import { Authenticated } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { AppException } from '../../common/errors/app.exception.js';
import { auditContext, CurrentUser, type RequestUser } from './access-token.guard.js';
import { SessionsService } from './sessions.service.js';
import { StaffUsers, toAuthUser, WEB_ROLES } from './staff-users.js';
import { TokensService } from './tokens.service.js';
import type { z } from 'zod';

/**
 * O'z sessiyalari (FR-AUTH-7). Faqat autentifikatsiya talab qilinadi: har kim faqat o'zinikini
 * ko'radi/bekor qiladi (scope = joriy foydalanuvchi). Boshqa xodim sessiyasi — T-101 (`staff.manage`).
 */
@Authenticated()
@NoAudit('audit service ichida yoziladi')
@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class SessionsController {
  constructor(
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(TokensService) private readonly tokens: TokensService,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser): Promise<AuthUser> {
    const u = await this.staff.byId(user.id);
    if (!u) throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
    return toAuthUser(u, user.role);
  }

  /** Rol almashtirish (FR-AUTH-5): yangi access token; eski rolli token darhol yaroqsiz. */
  @Post('role')
  @HttpCode(HttpStatus.OK)
  async switchRole(
    @CurrentUser() user: RequestUser,
    @ZodBody(SwitchRoleRequest) body: z.output<typeof SwitchRoleRequest>,
    @Req() req: FastifyRequest,
  ) {
    const u = await this.staff.byId(user.id);
    // Mini App (sessiyasiz) rolni initData bilan yangi token olib almashtiradi.
    if (!user.sessionId || !u || !u.roles.includes(body.role) || !WEB_ROLES.includes(body.role)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'ROLE_NOT_ASSIGNED');
    }
    const sessionId = user.sessionId;
    await this.sessions.switchRole(sessionId, body.role);
    await this.audit.record(auditContext(req), {
      action: 'auth.role_switched',
      entity: 'session',
      entityId: sessionId,
      before: { role: user.role },
      after: { role: body.role },
    });
    const accessToken = await this.tokens.signAccess({
      sub: u.id,
      role: body.role,
      sid: sessionId,
      pv: u.permissionsVersion,
    });
    return { accessToken, user: toAuthUser(u, body.role) };
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Faol sessiyalarim (qurilmalar)' })
  async list(@CurrentUser() user: RequestUser): Promise<SessionInfo[]> {
    const rows = await this.sessions.listActive(user.id);
    return rows.map((s) => ({
      id: s.id,
      device: s.device,
      ip: s.ip,
      createdAt: s.createdAt.toISOString(),
      current: s.id === user.sessionId,
    }));
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentUser() user: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    if (!(await this.sessions.revokeOwn(user.id, id))) {
      throw new AppException(HttpStatus.NOT_FOUND, 'NOT_FOUND');
    }
    await this.audit.record(auditContext(req), {
      action: 'auth.session_revoked',
      entity: 'session',
      entityId: id,
    });
  }

  @Post('sessions/revoke-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Barcha qurilmalardan chiqish' })
  async revokeAll(@CurrentUser() user: RequestUser, @Req() req: FastifyRequest): Promise<void> {
    await this.sessions.revokeAllForUser(user.id);
    await this.audit.record(auditContext(req), {
      action: 'auth.sessions_revoked_all',
      entity: 'user',
      entityId: user.id,
    });
  }
}
