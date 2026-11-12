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
  CreateStudentRequest,
  type StudentDetail,
  StudentListQuery,
  type StudentListResult,
  UpdateStudentRequest,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { auditContext } from '../../common/audit/request-context.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { FilesService } from '../files/index.js';
import { StudentsQueryService } from './students-query.service.js';
import { StudentsService } from './students.service.js';

/**
 * O'quvchilar (T-105, W-07/W-08). O'qish — `student.view` + scope (Ota-ona — o'z farzandi);
 * yozish — `student.manage` (Director, Admin).
 */
@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
export class StudentsController {
  constructor(
    @Inject(StudentsService) private readonly students: StudentsService,
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

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('student.manage')
  @NoAudit('StudentsService.create ichida')
  @ApiOperation({ summary: "O'quvchi qo'shish (+ ota-onalar); dublikat — 409" })
  create(
    @ZodBody(CreateStudentRequest) body: z.output<typeof CreateStudentRequest>,
    @Req() req: FastifyRequest,
  ): Promise<StudentDetail> {
    return this.students.create(auditContext(req), body);
  }

  @Patch(':id')
  @RequirePermission('student.manage')
  @NoAudit('StudentsService.update ichida (before/after)')
  @ApiOperation({ summary: 'Tahrirlash' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateStudentRequest) body: z.output<typeof UpdateStudentRequest>,
    @Req() req: FastifyRequest,
  ): Promise<StudentDetail> {
    return this.students.update(auditContext(req), id, body);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('StudentsService.setArchived ichida')
  @ApiOperation({ summary: 'Arxivlash (FR-STU-6)' })
  archive(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest) {
    return this.students.setArchived(auditContext(req), id, 'archive');
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('StudentsService.setArchived ichida')
  @ApiOperation({ summary: 'Arxivdan chiqarish' })
  restore(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest) {
    return this.students.setArchived(auditContext(req), id, 'restore');
  }
}
