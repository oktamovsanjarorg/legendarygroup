import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type LessonGradesResponse,
  SetLessonGradesRequest,
  type SetLessonGradesInput,
  StudentGradesQuery,
  type StudentGradesQueryInput,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { Audit, NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { GradesService } from './grades.service.js';

@ApiTags('Grades')
@ApiBearerAuth()
@Controller('grades')
export class GradesController {
  constructor(@Inject(GradesService) private readonly grades: GradesService) {}

  @Get('lessons/:lessonId')
  @RequirePermission('results.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-GRD-1 Darsdagi baholar va izohlar roʻyxati' })
  async getLessonGrades(
    @CurrentUser() user: RequestUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
  ): Promise<LessonGradesResponse> {
    return this.grades.getLessonGrades(user, lessonId);
  }

  @Post('lessons/:lessonId')
  @RequirePermission('grade.write')
  @Audit({ action: 'grade.write', entity: 'grade' })
  @ApiOperation({ summary: 'FR-GRD-1, 2, BR-33 Baholar va izohlarni saqlash' })
  async setLessonGrades(
    @CurrentUser() user: RequestUser,
    @Param('lessonId', ParseUUIDPipe) lessonId: string,
    @ZodBody(SetLessonGradesRequest) body: SetLessonGradesInput,
    @Req() req: FastifyRequest,
  ): Promise<LessonGradesResponse> {
    return this.grades.setLessonGrades(user, lessonId, body, auditContext(req));
  }

  @Get('history')
  @RequirePermission('results.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'Oʻquvchining baholar tarixi va ustoz izohlari' })
  async getStudentGradesHistory(
    @CurrentUser() user: RequestUser,
    @ZodQuery(StudentGradesQuery) query: StudentGradesQueryInput,
  ) {
    return this.grades.getStudentGradesHistory(user, query);
  }
}
