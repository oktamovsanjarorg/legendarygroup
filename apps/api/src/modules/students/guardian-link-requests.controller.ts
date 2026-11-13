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
  ApproveGuardianLinkRequestSchema,
  type GuardianLinkRequest,
  ListGuardianLinkRequestsQuerySchema,
  RejectGuardianLinkRequestSchema,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { GuardianLinkRequestsService } from './guardian-link-requests.service.js';

@ApiTags('Students')
@ApiBearerAuth()
@Controller('guardians/link-requests')
export class GuardianLinkRequestsController {
  constructor(
    @Inject(GuardianLinkRequestsService) private readonly service: GuardianLinkRequestsService,
  ) {}

  @Get()
  @RequirePermission('student.manage')
  @ApiOperation({ summary: 'Bogʻlanish soʻrovlari roʻyxati (W-07)' })
  list(
    @ZodQuery(ListGuardianLinkRequestsQuerySchema)
    q: z.output<typeof ListGuardianLinkRequestsQuerySchema>,
  ): Promise<{ items: GuardianLinkRequest[]; total: number }> {
    return this.service.list(q);
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('GuardianLinkRequestsService.approve ichida')
  @ApiOperation({ summary: 'Bogʻlanish soʻrovini tasdiqlash' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ApproveGuardianLinkRequestSchema)
    body: z.output<typeof ApproveGuardianLinkRequestSchema>,
    @Req() req: FastifyRequest,
  ): Promise<GuardianLinkRequest> {
    return this.service.approve(auditContext(req), id, body);
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('GuardianLinkRequestsService.reject ichida')
  @ApiOperation({ summary: 'Bogʻlanish soʻrovini rad etish' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(RejectGuardianLinkRequestSchema)
    body: z.output<typeof RejectGuardianLinkRequestSchema>,
    @Req() req: FastifyRequest,
  ): Promise<GuardianLinkRequest> {
    return this.service.reject(auditContext(req), id, body);
  }
}
