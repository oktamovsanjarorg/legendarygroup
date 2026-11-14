import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type LessonAttendance,
  MarkAttendanceRequest,
  type MarkAttendanceInput,
  StudentAttendanceHistoryQuery,
  type StudentAttendanceHistoryQueryInput,
  type UnmarkedLessonItem,
  type UnmarkedLessonsQuery,
  UnmarkedLessonsQuerySchema,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { AttendanceService } from './attendance.service.js';

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
export class AttendanceController {
  constructor(@Inject(AttendanceService) private readonly attendance: AttendanceService) {}

  @Get('lessons/:lessonId')
  @RequirePermission('attendance.mark')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-ATT-1 Dars davomati va oʻquvchilar roʻyxati' })
  async getLessonAttendance(
    @CurrentUser() user: RequestUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LessonAttendance> {
    return this.attendance.getLessonAttendance(user, lessonId);
  }

  @Post('lessons/:lessonId')
  @RequirePermission('attendance.mark')
  @Audit({ action: 'attendance.mark', entity: 'attendance' })
  @ApiOperation({ summary: 'FR-ATT-2, BR-30 Davomat belgilash / tahrirlash' })
  async markAttendance(
    @CurrentUser() user: RequestUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @ZodBody(MarkAttendanceRequest) body: MarkAttendanceInput,
    @Req() req: FastifyRequest,
  ): Promise<LessonAttendance> {
    return this.attendance.markAttendance(user, lessonId, body, auditContext(req));
  }

  @Get('history')
  @RequirePermission('student.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Oʻquvchining davomat tarixi' })
  async getStudentHistory(
    @CurrentUser() user: RequestUser,
    @ZodQuery(StudentAttendanceHistoryQuery) query: StudentAttendanceHistoryQueryInput,
  ) {
    return this.attendance.getStudentHistory(user, query);
  }

  @Get('unmarked')
  @RequirePermission('attendance.edit_past')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-ATT-5 Belgilanmagan darslar roʻyxati (W-12)' })
  async getUnmarkedLessons(
    @CurrentUser() user: RequestUser,
    @ZodQuery(UnmarkedLessonsQuerySchema) query: UnmarkedLessonsQuery,
  ): Promise<{ items: UnmarkedLessonItem[] }> {
    return this.attendance.getUnmarkedLessons(user, query);
  }
}
