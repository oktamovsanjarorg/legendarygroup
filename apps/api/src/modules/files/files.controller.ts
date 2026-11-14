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
import { CreateUploadRequest } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import type { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { Authenticated } from '../../common/decorators/access.decorators.js';
import { ZodBody } from '../../common/decorators/zod.decorators.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { FilesService } from './files.service.js';

/**
 * Ruxsat maqsadga bog'liq (`FILE_PURPOSES[purpose].upload/view`) — shuning uchun
 * `@Authenticated` + service ichida ruxsat tekshiruvi (ADR 0007: dinamik ruxsat).
 */
@Authenticated()
@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @Post('uploads')
  @HttpCode(HttpStatus.OK)
  @NoAudit("hali fayl yo'q — audit `complete`da")
  @ApiOperation({ summary: "S3'ga to'g'ridan-to'g'ri yuklash (presigned POST, 15 daq)" })
  create(
    @CurrentUser() user: RequestUser,
    @ZodBody(CreateUploadRequest) body: z.output<typeof CreateUploadRequest>,
  ) {
    return this.files.createUpload(user, body);
  }

  @Post('uploads/:uploadId/complete')
  @HttpCode(HttpStatus.OK)
  @NoAudit('FilesService.ingest ichida')
  @ApiOperation({ summary: 'Yuklashni yakunlash: tekshirish, qayta ishlash, saqlash' })
  complete(
    @CurrentUser() user: RequestUser,
    @Param('uploadId', ParseUUIDPipe) uploadId: string,
    @Req() req: FastifyRequest,
  ) {
    return this.files.completeUpload(user, uploadId, auditContext(req));
  }

  @Get(':id/url')
  @ApiOperation({ summary: "Ko'rish havolasi (5 daq)" })
  url(@CurrentUser() user: RequestUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.files.viewUrl(user, id);
  }
}
