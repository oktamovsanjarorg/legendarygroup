import { Controller, Get, Inject, Put, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SaveTeacherCodesRequest, TeacherCodesQuery, type TeacherCodesResult } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../../common/audit/audit.decorator.js';
import { auditContext } from '../../../common/audit/request-context.js';
import { RequirePermission } from '../../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../../auth/index.js';
import { TeacherCodesService } from './teacher-codes.service.js';

/** Ustozning oʻz oʻquvchi kodlari — titul va Excel import uchun (T-128, MT-07a). */
@ApiTags('Teacher codes')
@ApiBearerAuth()
@Controller('teacher-codes')
export class TeacherCodesController {
  constructor(@Inject(TeacherCodesService) private readonly codes: TeacherCodesService) {}

  @Get()
  @RequirePermission('test.manage')
  @ApiOperation({ summary: 'Guruh oʻquvchilari, ustoz kodlari va boʻsh kod taklifi' })
  list(
    @ZodQuery(TeacherCodesQuery) q: z.output<typeof TeacherCodesQuery>,
    @CurrentUser() user: RequestUser,
  ): Promise<TeacherCodesResult> {
    return this.codes.list(user, q.groupId);
  }

  @Put()
  @RequirePermission('test.manage')
  @NoAudit('TeacherCodesService.save ichida')
  @ApiOperation({ summary: 'Kodlarni saqlash (null — olib tashlash); band kod — 409' })
  save(
    @ZodBody(SaveTeacherCodesRequest) body: z.output<typeof SaveTeacherCodesRequest>,
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
  ): Promise<TeacherCodesResult> {
    return this.codes.save(auditContext(req), user, body);
  }
}
