import {
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AssignTeacherRequest,
  EndAssignmentRequest,
  type GroupDetail,
  ReplaceScheduleRequest,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { GroupScheduleService } from './group-schedule.service.js';

/** Guruh jadvali va ustozlari (T-103, W-10). Hammasi `group.manage`. */
@ApiTags('Groups')
@ApiBearerAuth()
@Controller('groups/:id')
export class GroupScheduleController {
  constructor(@Inject(GroupScheduleService) private readonly schedule: GroupScheduleService) {}

  @Put('schedule')
  @RequirePermission('group.manage')
  @NoAudit('GroupScheduleService ichida')
  @ApiOperation({ summary: 'Jadvalni sanadan almashtirish (oʻtmish saqlanadi)' })
  replace(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(ReplaceScheduleRequest) body: z.output<typeof ReplaceScheduleRequest>,
    @Req() req: FastifyRequest,
  ): Promise<GroupDetail> {
    return this.schedule.replaceSchedule(auditContext(req), id, body);
  }

  @Post('teachers')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('group.manage')
  @NoAudit('GroupScheduleService ichida')
  @ApiOperation({ summary: 'Ustoz biriktirish; yangi asosiy — amaldagisini almashtiradi' })
  assign(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(AssignTeacherRequest) body: z.output<typeof AssignTeacherRequest>,
    @Req() req: FastifyRequest,
  ): Promise<GroupDetail> {
    return this.schedule.assignTeacher(auditContext(req), id, body);
  }

  @Post('teachers/:assignmentId/end')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('group.manage')
  @NoAudit('GroupScheduleService ichida')
  @ApiOperation({ summary: 'Biriktirishni sanada yakunlash' })
  end(
    @Param('id', ParseUUIDPipe) groupId: string,
    @Param('assignmentId', ParseUUIDPipe) assignmentId: string,
    @ZodBody(EndAssignmentRequest) body: z.output<typeof EndAssignmentRequest>,
    @Req() req: FastifyRequest,
  ): Promise<GroupDetail> {
    return this.schedule.endAssignment(auditContext(req), { groupId, assignmentId }, body.to);
  }
}
