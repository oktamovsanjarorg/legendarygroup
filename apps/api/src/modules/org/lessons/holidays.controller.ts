import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateHolidayRequest, type HolidayDto, HolidayListQuery } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { NoAudit } from '../../../common/audit/audit.decorator.js';
import { auditContext } from '../../../common/audit/request-context.js';
import { RequirePermission } from '../../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../../common/decorators/zod.decorators.js';
import { AppException } from '../../../common/errors/app.exception.js';
import { HolidaysService } from './holidays.service.js';

const DateParam = z.iso.date();

/** Bayramlar kalendari (T-104). O'qish — `group.view`; o'zgartirish — `lesson.manage`. */
@ApiTags('Lessons')
@ApiBearerAuth()
@Controller('holidays')
export class HolidaysController {
  constructor(@Inject(HolidaysService) private readonly holidays: HolidaysService) {}

  @Get()
  @RequirePermission('group.view')
  @ApiOperation({ summary: 'Yil bayramlari' })
  list(@ZodQuery(HolidayListQuery) q: z.output<typeof HolidayListQuery>): Promise<HolidayDto[]> {
    return this.holidays.list(q.year);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('lesson.manage')
  @NoAudit('HolidaysService ichida')
  @ApiOperation({ summary: 'Bayram qoʻshish (shu kundagi darslar bekor/oʻchiriladi)' })
  create(
    @ZodBody(CreateHolidayRequest) body: z.output<typeof CreateHolidayRequest>,
    @Req() req: FastifyRequest,
  ): Promise<HolidayDto> {
    return this.holidays.create(auditContext(req), body);
  }

  @Delete(':date')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('lesson.manage')
  @NoAudit('HolidaysService ichida')
  @ApiOperation({ summary: 'Bayramni olib tashlash (darslar qayta generatsiya qilinadi)' })
  async remove(@Param('date') date: string, @Req() req: FastifyRequest): Promise<void> {
    if (!DateParam.safeParse(date).success)
      throw new AppException(HttpStatus.BAD_REQUEST, 'VALIDATION_ERROR', { field: 'date' });
    await this.holidays.remove(auditContext(req), date);
  }
}
