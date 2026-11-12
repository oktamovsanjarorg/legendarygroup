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
import { type Course, CreateCourseRequest, OrgListQuery, UpdateCourseRequest } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { auditContext } from '../auth/index.js';
import { CoursesService } from './courses.service.js';

/** Kurslar (T-102, W-09). Hammasi `course.manage` (02 §2 — Director, Admin). */
@ApiTags('Org')
@ApiBearerAuth()
@Controller('courses')
export class CoursesController {
  constructor(@Inject(CoursesService) private readonly courses: CoursesService) {}

  @Get()
  @RequirePermission('course.manage')
  @ApiOperation({ summary: "Kurslar ro'yxati (standart — faollari)" })
  list(@ZodQuery(OrgListQuery) q: z.output<typeof OrgListQuery>): Promise<Course[]> {
    return this.courses.list(q.status);
  }

  @Get(':id')
  @RequirePermission('course.manage')
  @ApiOperation({ summary: 'Kurs' })
  get(@Param('id', ParseUUIDPipe) id: string): Promise<Course> {
    return this.courses.get(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('course.manage')
  @NoAudit('CoursesService.create ichida')
  @ApiOperation({ summary: "Kurs qo'shish" })
  create(
    @ZodBody(CreateCourseRequest) body: z.output<typeof CreateCourseRequest>,
    @Req() req: FastifyRequest,
  ): Promise<Course> {
    return this.courses.create(auditContext(req), body);
  }

  @Patch(':id')
  @RequirePermission('course.manage')
  @NoAudit('CoursesService.update ichida (before/after)')
  @ApiOperation({ summary: 'Kursni tahrirlash' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateCourseRequest) body: z.output<typeof UpdateCourseRequest>,
    @Req() req: FastifyRequest,
  ): Promise<Course> {
    return this.courses.update(auditContext(req), id, body);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('course.manage')
  @NoAudit('CoursesService.setArchived ichida')
  @ApiOperation({ summary: 'Arxivlash' })
  archive(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest): Promise<Course> {
    return this.courses.setArchived(auditContext(req), id, 'archive');
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('course.manage')
  @NoAudit('CoursesService.setArchived ichida')
  @ApiOperation({ summary: 'Arxivdan chiqarish' })
  restore(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest): Promise<Course> {
    return this.courses.setArchived(auditContext(req), id, 'restore');
  }
}
