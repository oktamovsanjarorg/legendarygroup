import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type EnrollmentDto, RosterQuery, type RosterResult } from '@lg/contracts';
import type { z } from 'zod';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { EnrollmentsQueryService } from './enrollments-query.service.js';

/** Enrollment'larni o'qish (T-106): o'quvchi tarixi va guruh ro'yxati. */
@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller()
export class RosterController {
  constructor(@Inject(EnrollmentsQueryService) private readonly query: EnrollmentsQueryService) {}

  @Get('students/:id/enrollments')
  @RequirePermission('student.view')
  @ApiOperation({ summary: "O'quvchi guruhlari (tarix, muzlatishlar) — scope bilan" })
  forStudent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<EnrollmentDto[]> {
    return this.query.forStudent(user, id);
  }

  @Get('groups/:id/students')
  @RequirePermission('group.view')
  @ApiOperation({ summary: "Guruh ro'yxati sanada (BR-32); Ustoz — o'z guruhi" })
  roster(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodQuery(RosterQuery) q: z.output<typeof RosterQuery>,
    @CurrentUser() user: RequestUser,
  ): Promise<RosterResult> {
    return this.query.roster(user, id, q.date);
  }
}
