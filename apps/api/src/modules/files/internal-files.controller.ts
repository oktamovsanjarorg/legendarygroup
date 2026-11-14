import {
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { FilePurposeSchema } from '@lg/contracts';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import { NoAudit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { AppException } from '../../common/errors/app.exception.js';
import { InternalTokenGuard } from '../../common/guards/internal-token.guard.js';
import { FilesService } from './files.service.js';

const Meta = z.object({ purpose: FilePurposeSchema, uploadedBy: z.string().uuid() });

/**
 * Bot (T-010/T-206): Telegram'dan olingan faylni xom bayt (`application/octet-stream`) sifatida
 * yuboradi; `x-file-purpose`, `x-uploaded-by` — kim nomidan. Faqat ichki tarmoq + xizmat tokeni.
 * Bot fayl yuborishdan oldin foydalanuvchi ruxsatini API orqali tekshirgan bo'ladi.
 */
@Public()
@NoAudit('FilesService.ingest ichida')
@ApiTags('Internal')
@ApiSecurity('internal-token')
@UseGuards(InternalTokenGuard)
@Controller('internal/files')
export class InternalFilesController {
  constructor(@Inject(FilesService) private readonly files: FilesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  ingest(
    @Headers('x-file-purpose') purpose: string | undefined,
    @Headers('x-uploaded-by') uploadedBy: string | undefined,
    @Req() req: FastifyRequest,
  ) {
    const meta = Meta.parse({ purpose, uploadedBy });
    if (!Buffer.isBuffer(req.body)) throw new AppException(HttpStatus.BAD_REQUEST, 'BAD_REQUEST');
    return this.files.ingest(
      req.body,
      { purpose: meta.purpose, uploadedBy: meta.uploadedBy },
      {
        ...auditContext(req),
        actorId: meta.uploadedBy,
      },
    );
  }
}
