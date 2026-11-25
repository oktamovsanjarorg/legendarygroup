import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { uuidv7 } from 'uuidv7';
import type { AuditContext } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import type { RequestUser } from '../auth/index.js';
import { FilesService } from '../files/index.js';
import { NotificationsService } from '../notifications/index.js';
import { TestsService } from './tests.service.js';

const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * T-154: Excel shablon — so'ragan foydalanuvchining bot chatiga (ADR 0008 §5). Telegram
 * WebView'da blob yuklab olish ishonchsiz; fayl chatda qoladi, to'ldirib qayta yuboriladi.
 */
@Injectable()
export class TestTemplateDeliveryService {
  constructor(
    @Inject(TestsService) private readonly tests: TestsService,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
  ) {}

  async send(actor: RequestUser, testId: string, ctx: AuditContext): Promise<{ status: 'queued' }> {
    const { title } = await this.tests.getTest(actor, testId);
    if (!(await this.notifications.hasTelegram(actor.id)))
      throw new AppException(HttpStatus.CONFLICT, 'NO_TELEGRAM');
    const buffer = await this.tests.getTemplate(actor, testId);
    const stored = await this.files.ingest(
      buffer,
      { purpose: 'report_export', declaredMime: XLSX, uploadedBy: actor.id },
      ctx,
    );
    await this.notifications.notify({
      userId: actor.id,
      type: 'report_file',
      dedupeKey: `test-template-${uuidv7()}`,
      payload: {
        title,
        body: '',
        fileId: stored.id,
        fileName: `shablon-${testId.slice(0, 8)}.xlsx`,
        fileType: 'document',
      },
    });
    return { status: 'queued' };
  }
}
