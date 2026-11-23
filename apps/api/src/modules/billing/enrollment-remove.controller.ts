import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { EnrollmentRemoveService } from './enrollment-remove.service.js';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing/enrollments/:id')
export class EnrollmentRemoveController {
  constructor(@Inject(EnrollmentRemoveService) private readonly svc: EnrollmentRemoveService) {}

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('student.manage')
  @NoAudit('EnrollmentsService.removeMistaken ichida')
  @ApiOperation({ summary: 'Q-96: xato yozilgan aʼzolikni olib tashlash (toʻlov tegmagan boʻlsa)' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest): Promise<void> {
    await this.svc.remove(auditContext(req), id);
  }
}
