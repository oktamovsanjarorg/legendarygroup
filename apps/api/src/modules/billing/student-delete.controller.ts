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
import { StudentDeleteService } from './student-delete.service.js';

/** Yo'l `/students/:id` — o'quvchi resursi; pul tekshiruvi kerakligi uchun billing modulida. */
@ApiTags('Students')
@ApiBearerAuth()
@Controller('students/:id')
export class StudentDeleteController {
  constructor(@Inject(StudentDeleteService) private readonly svc: StudentDeleteService) {}

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('student.delete')
  @NoAudit('StudentPurgeService.purge ichida')
  @ApiOperation({ summary: 'Q-124: arxivdagi, pul tarixi yoʻq oʻquvchini butunlay oʻchirish' })
  async remove(@Param('id', ParseUUIDPipe) id: string, @Req() req: FastifyRequest): Promise<void> {
    await this.svc.remove(auditContext(req), id);
  }
}
