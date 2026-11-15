import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type GroupAttendance,
  GroupAttendanceQuery,
  type GroupAttendanceQueryInput,
} from '@lg/contracts';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { AttendanceGridService } from './attendance-grid.service.js';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance/groups')
export class AttendanceGridController {
  constructor(@Inject(AttendanceGridService) private readonly svc: AttendanceGridService) {}

  @Get()
  @RequirePermission('attendance.mark')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'W-12: guruh davomati jadvali (darslar × oʻquvchilar)' })
  async grid(
    @CurrentUser() user: RequestUser,
    @ZodQuery(GroupAttendanceQuery) query: GroupAttendanceQueryInput,
  ): Promise<GroupAttendance> {
    return this.svc.grid(user, query);
  }
}
