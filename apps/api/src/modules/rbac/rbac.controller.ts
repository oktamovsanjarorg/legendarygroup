import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS, ROLES } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { auditContext } from '../auth/index.js';
import { RbacService } from './rbac.service.js';

const PermissionParam = z.enum(PERMISSIONS);
const RoleParam = z.enum(ROLES);
const OverrideBody = z.object({ granted: z.boolean() });

/**
 * Xodim ruxsatlari va holati (02 §4, T-008). Audit — service ichida (before/after bilan).
 * Xodim yaratish va UI — T-101.
 */
@ApiTags('RBAC')
@ApiBearerAuth()
@Controller('rbac/users/:userId')
export class RbacController {
  constructor(@Inject(RbacService) private readonly rbac: RbacService) {}

  @Put('overrides/:permission')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('staff.permissions')
  @NoAudit('RbacService.setOverride ichida')
  async setOverride(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('permission') permission: string,
    @ZodBody(OverrideBody) body: z.output<typeof OverrideBody>,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.rbac.setOverride(auditContext(req), {
      userId,
      permission: PermissionParam.parse(permission),
      granted: body.granted,
    });
  }

  @Delete('overrides/:permission')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('staff.permissions')
  @NoAudit('RbacService.setOverride ichida')
  async clearOverride(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('permission') permission: string,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.rbac.setOverride(auditContext(req), {
      userId,
      permission: PermissionParam.parse(permission),
      granted: null,
    });
  }

  @Post('block')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('staff.manage')
  @NoAudit('RbacService.blockUser ichida')
  async block(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.rbac.blockUser(auditContext(req), userId);
  }

  @Delete('roles/:role')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('staff.manage')
  @NoAudit('RbacService.removeRole ichida')
  async removeRole(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('role') role: string,
    @Req() req: FastifyRequest,
  ): Promise<void> {
    await this.rbac.removeRole(auditContext(req), userId, RoleParam.parse(role));
  }
}
