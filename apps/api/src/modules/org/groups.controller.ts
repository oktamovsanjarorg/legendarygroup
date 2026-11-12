import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type GroupDetail, GroupListQuery, type GroupListItem } from '@lg/contracts';
import type { z } from 'zod';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { GroupsQueryService } from './groups-query.service.js';

/** Guruhlarni o'qish (T-103, W-10). `group.view` + scope (Ustoz — bugungi guruhlari). */
@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
  constructor(@Inject(GroupsQueryService) private readonly query: GroupsQueryService) {}

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
}
