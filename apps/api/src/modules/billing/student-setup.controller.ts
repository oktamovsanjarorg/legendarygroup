import {
  Controller,
  Get,
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
  StudentBillingSetupRequest,
  type StudentBillingSetupInput,
  type StudentBillingSetupState,
} from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { StudentBillingSetupService } from './student-setup.service.js';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing/students/:id/setup')
export class StudentBillingSetupController {
  constructor(
    @Inject(StudentBillingSetupService) private readonly svc: StudentBillingSetupService,
  ) {}

  @Get()
  @RequirePermission('student.manage')
  @NoAudit('GET — yozuv yoʻq')
  @ApiOperation({ summary: 'T-145: boshlangʻich holat sozlanganmi' })
  state(@Param('id', ParseUUIDPipe) id: string): Promise<StudentBillingSetupState> {
    return this.svc.state(id);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @RequirePermission('student.manage')
  @NoAudit('StudentBillingSetupService ichida')
  @ApiOperation({ summary: 'T-145: kelgan sana va tizimdan oldingi qarz → joriy oy hisobi' })
  setup(
    @Param('id', ParseUUIDPipe) id: string,
    @ZodBody(StudentBillingSetupRequest) body: StudentBillingSetupInput,
    @Req() req: FastifyRequest,
  ): Promise<StudentBillingSetupState> {
    return this.svc.setup(auditContext(req), id, body);
  }
}
