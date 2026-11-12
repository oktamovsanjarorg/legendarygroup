import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type StudentDetail, StudentListQuery, type StudentListResult } from '@lg/contracts';
import type { z } from 'zod';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodQuery } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { FilesService } from '../files/index.js';
import { StudentsQueryService } from './students-query.service.js';

/**
 * O'quvchilar (T-105, W-07/W-08). O'qish — `student.view` + scope (Ota-ona — o'z farzandi);
 * yozish — `student.manage` (Director, Admin).
 */
@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(
    @Inject(StudentsQueryService) private readonly query: StudentsQueryService,
    @Inject(FilesService) private readonly files: FilesService,
  ) {}

  @Get()
  @RequirePermission('student.view')
  @ApiOperation({ summary: "Ro'yxat/qidiruv: ism, kod, telefon (FR-STU-5)" })
  list(
    @ZodQuery(StudentListQuery) q: z.output<typeof StudentListQuery>,
    @CurrentUser() user: RequestUser,
  ): Promise<StudentListResult> {
    return this.query.list(user, q);
  }

  @Get(':id')
  @RequirePermission('student.view')
  @ApiOperation({ summary: 'Kartochka (field-level filtr — 02 §3)' })
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<StudentDetail> {
    return this.query.detail(user, id);
  }

  @Get(':id/photo')
  @RequirePermission('student.view')
  @ApiOperation({ summary: 'Rasm havolasi (5 daq, scope bilan)' })
  async photo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<{ url: string; expiresAt: string }> {
    return this.files.scopedViewUrl(await this.query.photoFileId(user, id));
  }
}
