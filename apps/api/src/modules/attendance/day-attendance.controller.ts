import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type DayAttendance, DayAttendanceQuery } from '@lg/contracts';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
import { DayAttendanceService } from './day-attendance.service.js';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance/day')
export class DayAttendanceController {
  constructor(@Inject(DayAttendanceService) private readonly svc: DayAttendanceService) {}

  @Get()
  @RequirePermission('attendance.edit_past')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'MS-13: kun darslari davomati va kelmaganlar' })
  day(
    @ZodQuery(DayAttendanceQuery) q: z.output<typeof DayAttendanceQuery>,
  ): Promise<DayAttendance> {
    return this.svc.day(q.date);
  }
}
