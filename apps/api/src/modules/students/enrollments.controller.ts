import {
  Controller,
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
  EndEnrollmentRequest,
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

/** Guruhga yozish (T-106, FR-STU-3). Hammasi `student.manage` (Director, Admin). */
@ApiTags('Enrollments')
@ApiBearerAuth()
@Controller('enrollments')
export class EnrollmentsController {
  constructor(@Inject(EnrollmentsService) private readonly enrollments: EnrollmentsService) {}

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
}
