import { Controller, Get, Inject, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type GroupLeaderboardResponse,
  type LessonGradesResponse,
  SetLessonGradesRequest,
  type SetLessonGradesInput,
  type StudentProgressResponse,
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
import { ProgressService } from './progress.service.js';

@ApiTags('Grades')
@ApiBearerAuth()
@Controller('grades')
export class GradesController {
  constructor(
    @Inject(GradesService) private readonly grades: GradesService,
    @Inject(ProgressService) private readonly progress: ProgressService,
  ) {}

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

  @Get('groups/:groupId/leaderboard')
  @RequirePermission('results.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-GRD-5 Guruh reytingi (leaderboard)' })
  async getGroupLeaderboard(
    @CurrentUser() user: RequestUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ): Promise<GroupLeaderboardResponse> {
    return this.progress.getGroupLeaderboard(user, groupId);
  }

  @Get('students/:studentId/progress')
  @RequirePermission('results.view')
  @NoAudit('GET query')
  @ApiOperation({ summary: 'FR-GRD-5 Oʻquvchi progressi va grafiklar dinamikasi' })
  async getStudentProgress(
    @CurrentUser() user: RequestUser,
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query('groupId') groupId?: string,
  ): Promise<StudentProgressResponse> {
    return this.progress.getStudentProgress(user, studentId, groupId);
  }
}
