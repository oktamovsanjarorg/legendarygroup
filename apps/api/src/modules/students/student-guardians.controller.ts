import {
  Controller,
  Delete,
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
  GuardianLookupQuery,
  type GuardianLookupResult,
  LinkGuardianRequest,
  RenameGuardianRequest,
  type StudentGuardian,
  UpdateGuardianLinkRequest,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody, ZodQuery } from '../../common/decorators/zod.decorators.js';
import { StudentGuardiansService } from './student-guardians.service.js';
import { StudentsQueryService } from './students-query.service.js';

/** Ota-onalar va bog'lanishlar (T-105, FR-STU-2). Hammasi `student.manage`. */
@ApiTags('Students')
@ApiBearerAuth()
@Controller()
export class StudentGuardiansController {
  constructor(
    @Inject(StudentGuardiansService) private readonly links: StudentGuardiansService,
    @Inject(StudentsQueryService) private readonly query: StudentsQueryService,
  ) {}

  @Get('guardians/lookup')
  @RequirePermission('student.manage')
  @ApiOperation({ summary: 'Telefon boʻyicha mavjud ota-onani topish (forma uchun)' })
  lookup(
    @ZodQuery(GuardianLookupQuery) q: z.output<typeof GuardianLookupQuery>,
  ): Promise<GuardianLookupResult> {
    return this.query.lookupGuardian(q.phone);
  }

  @Patch('guardians/:guardianId')
  @RequirePermission('student.manage')
  @NoAudit('StudentGuardiansService.rename ichida')
  @ApiOperation({ summary: 'Ota-ona ismini tuzatish' })
  async rename(
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
    @ZodBody(RenameGuardianRequest) body: z.output<typeof RenameGuardianRequest>,
    @Req() req: FastifyRequest,
  ): Promise<{ id: string; fullName: string }> {
    return this.links.rename(auditContext(req), guardianId, body.fullName);
  }

  @Post('students/:id/guardians')
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('student.manage')
  @NoAudit('StudentGuardiansService.link ichida')
  @ApiOperation({ summary: 'Ota-ona bogʻlash (telefon boʻyicha mavjudini topadi)' })
  link(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(LinkGuardianRequest) body: z.output<typeof LinkGuardianRequest>,
    @Req() req: FastifyRequest,
  ): Promise<StudentGuardian[]> {
    return this.links.link(auditContext(req), id, body);
  }

  @Patch('students/:id/guardians/:guardianId')
  @RequirePermission('student.manage')
  @NoAudit('StudentGuardiansService.update ichida')
  @ApiOperation({ summary: 'Qarindoshlik, asosiy, xabarnoma' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
    @ZodBody(UpdateGuardianLinkRequest) body: z.output<typeof UpdateGuardianLinkRequest>,
    @Req() req: FastifyRequest,
  ): Promise<StudentGuardian[]> {
    return this.links.update(auditContext(req), { studentId: id, guardianId }, body);
  }

  @Delete('students/:id/guardians/:guardianId')
  @RequirePermission('student.manage')
  @NoAudit('StudentGuardiansService.unlink ichida')
  @ApiOperation({ summary: 'Bogʻlanishni uzish — ota-ona kirishi darhol yopiladi' })
  unlink(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
    @Req() req: FastifyRequest,
  ): Promise<StudentGuardian[]> {
    return this.links.unlink(auditContext(req), { studentId: id, guardianId });
  }
}
