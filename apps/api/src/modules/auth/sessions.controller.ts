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
import type { AuthUser, SessionInfo } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { AuditService } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { auditContext, CurrentUser, type RequestUser } from './access-token.guard.js';
import { SessionsService } from './sessions.service.js';
import { StaffUsers, toAuthUser } from './staff-users.js';

/**
 * O'z sessiyalari (FR-AUTH-7). Faqat autentifikatsiya talab qilinadi: har kim faqat o'zinikini
 * ko'radi/bekor qiladi (scope = joriy foydalanuvchi). Boshqa xodim sessiyasi — T-101 (`staff.manage`).
 */
@ApiTags('Auth')
@ApiBearerAuth()
@Controller('auth')
export class SessionsController {
  constructor(
    @Inject(SessionsService) private readonly sessions: SessionsService,
    @Inject(StaffUsers) private readonly staff: StaffUsers,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: RequestUser): Promise<AuthUser> {
    const u = await this.staff.byId(user.id);
    if (!u) throw new AppException(HttpStatus.UNAUTHORIZED, 'UNAUTHORIZED');
    return toAuthUser(u, user.role);
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
