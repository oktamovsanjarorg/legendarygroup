import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  ChangeGroupStatusRequest,
  CreateGroupRequest,
  type GroupDetail,
  GroupListQuery,
  type GroupListItem,
  UpdateGroupRequest,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { GroupsQueryService } from './groups-query.service.js';
import { GroupsService } from './groups.service.js';

/**
 * Guruhlar (T-103, W-10). O'qish — `group.view` + scope (Ustoz — bugungi guruhlari);
 * yozish — `group.manage` (Director, Admin).
 */
@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(
    @Inject(GroupsQueryService) private readonly query: GroupsQueryService,
    @Inject(GroupsService) private readonly groups: GroupsService,
  ) {}

  @Get()
  @RequirePermission('group.view')
  @ApiOperation({ summary: "Guruhlar ro'yxati (standart — yakunlanmaganlar)" })
  list(
    @ZodQuery(GroupListQuery) q: z.output<typeof GroupListQuery>,
    @CurrentUser() user: RequestUser,
  ): Promise<GroupListItem[]> {
    return this.query.list(user, q);
  }

  @Get(':id')
  @RequirePermission('group.view')
  @ApiOperation({ summary: 'Guruh: ustozlar, jadval (tarix bilan)' })
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<GroupDetail> {
    return this.query.detail(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('group.manage')
  @NoAudit('GroupsService.create ichida')
  @ApiOperation({ summary: "Guruh qo'shish (slotlar, ustozlar bilan); to'qnashuv — 409" })
  create(
    @ZodBody(CreateGroupRequest) body: z.output<typeof CreateGroupRequest>,
    @Req() req: FastifyRequest,
  ): Promise<GroupDetail> {
    return this.groups.create(auditContext(req), body);
  }

  @Patch(':id')
  @RequirePermission('group.manage')
  @NoAudit('GroupsService.update ichida (before/after)')
  @ApiOperation({ summary: 'Guruhni tahrirlash (xona, narx, sigʻim, sanalar)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateGroupRequest) body: z.output<typeof UpdateGroupRequest>,
    @Req() req: FastifyRequest,
  ): Promise<GroupDetail> {
    return this.groups.update(auditContext(req), id, body);
  }

  @Post(':id/status')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('group.manage')
  @NoAudit('GroupsService.changeStatus ichida')
  @ApiOperation({ summary: 'Holat: forming → active ⇄ paused → finished' })
  status(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ChangeGroupStatusRequest) body: z.output<typeof ChangeGroupStatusRequest>,
    @Req() req: FastifyRequest,
  ): Promise<GroupDetail> {
    return this.groups.changeStatus(auditContext(req), id, body.status);
  }
}
