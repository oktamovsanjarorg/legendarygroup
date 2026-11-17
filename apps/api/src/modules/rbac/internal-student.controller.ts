import { Controller, HttpCode, HttpStatus, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { BotStudentLinkRequest, type BotStudentLinkResult } from '@lg/contracts';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard.js';
import { StudentLinkService } from './student-link.service.js';

/** Bot uchun ichki endpoint (T-126): oʻquvchini shaxsiy kod orqali bogʻlash. */
@Public()
@NoAudit('StudentLinkService ichida')
@ApiTags('Internal')
@ApiSecurity('internal-token')
@UseGuards(InternalTokenGuard)
@Controller('internal/student')
export class InternalStudentController {
  constructor(@Inject(StudentLinkService) private readonly studentLink: StudentLinkService) {}

  @Post('link')
  @HttpCode(HttpStatus.OK)
  link(
    @ZodBody(BotStudentLinkRequest) body: z.output<typeof BotStudentLinkRequest>,
  ): Promise<BotStudentLinkResult> {
    return this.studentLink.linkStudent(body);
  }
}
