import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  CreateFreezeRequest,
  EndEnrollmentRequest,
  EndFreezeRequest,
  type EnrollmentDto,
  EnrollRequest,
  TransferEnrollmentRequest,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { EnrollmentsService } from './enrollments.service.js';
import { FreezesService } from './freezes.service.js';

/** Guruhga yozish (T-106, FR-STU-3). Hammasi `student.manage` (Director, Admin). */
@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    @Inject(EnrollmentsService) private readonly enrollments: EnrollmentsService,
    @Inject(FreezesService) private readonly freezes: FreezesService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('student.manage')
  @NoAudit('EnrollmentsService.enroll ichida')
  @ApiOperation({ summary: "Guruhga yozish (sig'im, sana tekshiruvi)" })
  enroll(
    @ZodBody(EnrollRequest) body: z.output<typeof EnrollRequest>,
    @Req() req: FastifyRequest,
  ): Promise<EnrollmentDto> {
    return this.enrollments.enroll(auditContext(req), body);
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('EnrollmentsService.end ichida')
  @ApiOperation({ summary: 'Guruhdan chiqarish (sana, sabab)' })
  end(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(EndEnrollmentRequest) body: z.output<typeof EndEnrollmentRequest>,
    @Req() req: FastifyRequest,
  ): Promise<EnrollmentDto> {
    return this.enrollments.end(auditContext(req), id, body);
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('EnrollmentsService.transfer ichida')
  @ApiOperation({ summary: "Boshqa guruhga ko'chirish (yangi enrollment qaytadi)" })
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(TransferEnrollmentRequest) body: z.output<typeof TransferEnrollmentRequest>,
    @Req() req: FastifyRequest,
  ): Promise<EnrollmentDto> {
    return this.enrollments.transfer(auditContext(req), id, body);
  }

  @Post(':id/freezes')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('student.manage')
  @NoAudit('FreezesService.create ichida')
  @ApiOperation({ summary: 'Muzlatish (BR-9: ≥ 14 kun, sabab bilan)' })
  freeze(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(CreateFreezeRequest) body: z.output<typeof CreateFreezeRequest>,
    @Req() req: FastifyRequest,
  ): Promise<EnrollmentDto> {
    return this.freezes.create(auditContext(req), id, body);
  }

  @Post(':id/freezes/:freezeId/end')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('FreezesService.end ichida')
  @ApiOperation({ summary: 'Muzlatishni erta tugatish' })
  endFreeze(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Param('freezeId', ParseUUIDPipe) freezeId: string,
    @ZodBody(EndFreezeRequest) body: z.output<typeof EndFreezeRequest>,
    @Req() req: FastifyRequest,
  ): Promise<EnrollmentDto> {
    return this.freezes.end(auditContext(req), { enrollmentId, freezeId }, body.to);
  }

  @Delete(':id/freezes/:freezeId')
  @RequirePermission('student.manage')
  @NoAudit('FreezesService.cancel ichida')
  @ApiOperation({ summary: 'Boshlanmagan muzlatishni bekor qilish' })
  cancelFreeze(
    @Param('id', ParseUUIDPipe) enrollmentId: string,
    @Param('freezeId', ParseUUIDPipe) freezeId: string,
    @Req() req: FastifyRequest,
  ): Promise<EnrollmentDto> {
    return this.freezes.cancel(auditContext(req), { enrollmentId, freezeId });
  }
}
