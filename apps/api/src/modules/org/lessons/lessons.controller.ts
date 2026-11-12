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
  CancelLessonRequest,
  CreateExtraLessonRequest,
  LessonCalendarQuery,
  type LessonDto,
  MakeupLessonRequest,
  MoveLessonRequest,
  UpdateLessonRequest,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../../common/audit/audit.decorator.js';
import { auditContext } from '../../../common/audit/request-context.js';
import { RequirePermission } from '../../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../../auth/index.js';
import { LessonMakeupService } from './lesson-makeup.service.js';
import { LessonsQueryService } from './lessons-query.service.js';
import { LessonsService } from './lessons.service.js';

const NO_AUDIT = 'LessonsService / LessonMakeupService ichida';

/**
 * Darslar va kalendar (T-104). O'qish — `group.view` + scope (Ustoz — o'z guruhlari va
 * o'rinbosar darslari); o'zgartirish — `lesson.manage` (Director, Admin).
 */
@ApiTags('Lessons')
@ApiBearerAuth()
@Controller('lessons')
export class LessonsController {
  constructor(
    @Inject(LessonsQueryService) private readonly query: LessonsQueryService,
    @Inject(LessonsService) private readonly lessons: LessonsService,
    @Inject(LessonMakeupService) private readonly makeups: LessonMakeupService,
  ) {}

  @Get()
  @RequirePermission('group.view')
  @ApiOperation({ summary: 'Kalendar: oraliqdagi darslar (≤ 62 kun)' })
  calendar(
    @ZodQuery(LessonCalendarQuery) q: z.output<typeof LessonCalendarQuery>,
    @CurrentUser() user: RequestUser,
  ): Promise<LessonDto[]> {
    return this.query.calendar(user, q);
  }

  @Get(':id')
  @RequirePermission('group.view')
  @ApiOperation({ summary: 'Dars' })
  detail(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestUser,
  ): Promise<LessonDto> {
    return this.query.detail(user, id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('lesson.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Qoʻshimcha dars' })
  createExtra(
    @ZodBody(CreateExtraLessonRequest) body: z.output<typeof CreateExtraLessonRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LessonDto> {
    return this.makeups.createExtra(auditContext(req), body);
  }

  @Patch(':id')
  @RequirePermission('lesson.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Oʻrinbosar ustoz / boshqa xona (bitta dars)' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(UpdateLessonRequest) body: z.output<typeof UpdateLessonRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LessonDto> {
    return this.lessons.update(auditContext(req), id, body);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('lesson.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Bekor qilish (BR-5: kredit yoki qoplovchi dars)' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(CancelLessonRequest) body: z.output<typeof CancelLessonRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LessonDto> {
    return this.lessons.cancel(auditContext(req), id, body);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('lesson.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Bekor qilishni qaytarish' })
  restore(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest): Promise<LessonDto> {
    return this.lessons.restore(auditContext(req), id);
  }

  @Post(':id/move')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('lesson.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Koʻchirish (bekor + qoplovchi dars)' })
  move(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(MoveLessonRequest) body: z.output<typeof MoveLessonRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LessonDto> {
    return this.makeups.move(auditContext(req), id, body);
  }

  @Post(':id/makeup')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('lesson.manage')
  @NoAudit(NO_AUDIT)
  @ApiOperation({ summary: 'Bekor qilingan darsga qoplovchi dars' })
  makeup(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(MakeupLessonRequest) body: z.output<typeof MakeupLessonRequest>,
    @Req() req: FastifyRequest,
  ): Promise<LessonDto> {
    return this.makeups.makeup(auditContext(req), id, body);
  }
}
