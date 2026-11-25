import { Controller, HttpStatus, Inject, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { uuidv7 } from 'uuidv7';
import { Audit } from '../../common/audit/audit.decorator.js';
import { auditContext } from '../../common/audit/request-context.js';
import { RequirePermission } from '../../common/decorators/access.decorators.js';
import { AppException } from '../../common/errors/app.exception.js';
import { CurrentUser, type RequestUser } from '../auth/index.js';
import { FilesService } from '../files/index.js';
import { NotificationsService } from '../notifications/index.js';
import { PaymentsService } from './payments.service.js';
import { ReceiptPdfService } from './receipt-pdf.service.js';

/**
 * Chek PDF — so'ragan foydalanuvchining bot chatiga (ADR 0008 §5): Telegram WebView'da blob
 * yuklab olish ishonchsiz. Ko'rish huquqi — `GET receipts/:number/pdf` bilan bir xil.
 */
@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class ReceiptSendController {
  constructor(
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(ReceiptPdfService) private readonly pdf: ReceiptPdfService,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  @Post('receipts/:number/send')
  @RequirePermission('billing.view')
  @Audit({ action: 'receipt.send', entity: 'receipt' })
  @ApiOperation({ summary: 'Chek PDF bot chatiga (Mini App, FR-PAY-8)' })
  async send(
    @Param('number') number: string,
    @CurrentUser() user: RequestUser,
    @Req() req: FastifyRequest,
  ): Promise<{ status: 'queued' }> {
    await this.payments.assertReceiptVisible(user, number);
    if (!(await this.notifications.hasTelegram(user.id)))
      throw new AppException(HttpStatus.CONFLICT, 'NO_TELEGRAM');
    const buffer = await this.pdf.generateReceiptPdf(number);
    const stored = await this.files.ingest(
      buffer,
      { purpose: 'report_export', declaredMime: 'application/pdf', uploadedBy: user.id },
      auditContext(req),
    );
    await this.notifications.notify({
      userId: user.id,
      type: 'report_file',
      dedupeKey: `receipt-${uuidv7()}`,
      payload: {
        title: `Chek ${number}`,
        body: '',
        fileId: stored.id,
        fileName: `chek-${number}.pdf`,
        fileType: 'document',
      },
    });
    return { status: 'queued' };
  }
}
