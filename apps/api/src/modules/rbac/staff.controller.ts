import {
  Controller,
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
import {
  AddStaffRoleRequest,
  CreateStaffRequest,
  type CreateStaffResult,
  type StaffDetail,
  type StaffInvite,
  type StaffListItem,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { auditContext } from '../auth/index.js';
import { StaffQueryService } from './staff-query.service.js';
import { StaffService } from './staff.service.js';

/**
 * Xodimlar (T-101, W-28). Hammasi `staff.manage` (02 §4 — Director). Bloklash, rolni olish,
 * override — `RbacController` (`/rbac/users/:userId/...`).
 */
@ApiTags('Staff')
@ApiBearerAuth()
@Controller('staff')
export class StaffController {
  constructor(
    @Inject(StaffService) private readonly staff: StaffService,
    @Inject(StaffQueryService) private readonly query: StaffQueryService,
  ) {}

  @Get()
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: "Xodimlar ro'yxati" })
  list(): Promise<StaffListItem[]> {
    return this.query.list();
  }

  @Get(':userId')
  @RequirePermission('staff.manage')
  @ApiOperation({ summary: 'Xodim tafsiloti (rollar, override, taklif holati)' })
  detail(@Param('userId', ParseUUIDPipe) userId: string): Promise<StaffDetail> {
    return this.query.detail(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('staff.manage')
  @NoAudit('StaffService.create ichida')
  @ApiOperation({ summary: "Xodim qo'shish + taklif havolasi" })
  create(
    @ZodBody(CreateStaffRequest) body: z.output<typeof CreateStaffRequest>,
    @Req() req: FastifyRequest,
  ): Promise<CreateStaffResult> {
    return this.staff.create(auditContext(req), body);
  }

  @Post(':userId/invite')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('staff.manage')
  @NoAudit('StaffService.reissueInvite ichida')
  @ApiOperation({ summary: 'Taklifni qayta yuborish (eskisi yaroqsiz)' })
  invite(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: FastifyRequest,
  ): Promise<StaffInvite> {
    return this.staff.reissueInvite(auditContext(req), userId);
  }

  @Post(':userId/unblock')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('staff.manage')
  @NoAudit('StaffService.unblock ichida')
  async unblock(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.staff.unblock(auditContext(req), userId);
  }

  @Post(':userId/roles')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('staff.manage')
  @NoAudit('StaffService.addRole ichida')
  addRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @ZodBody(AddStaffRoleRequest) body: z.output<typeof AddStaffRoleRequest>,
    @Req() req: FastifyRequest,
  ): Promise<CreateStaffResult> {
    return this.staff.addRole(auditContext(req), userId, body.role);
  }
}
