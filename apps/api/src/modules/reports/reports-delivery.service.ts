import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import type { ReportType, SendReportRequest, SendReportResult } from '@lg/contracts';
import { createHash } from 'node:crypto';
import type { Redis } from 'ioredis';
import { uuidv7 } from 'uuidv7';
import type { AuditContext } from '../../common/audit/audit.service.js';
import { AppException } from '../../common/errors/app.exception.js';
import { REDIS_TOKEN } from '../../common/redis/redis.tokens.js';
import type { RequestUser } from '../auth/index.js';
import { FilesService } from '../files/index.js';
import { NotificationsService } from '../notifications/index.js';
import { ReportsService } from './reports.service.js';

/** T-158: shu vaqt ichida takror bosish — bitta fayl. */
const REPEAT_TTL_S = 10 * 60;

/** Hisobot fayli so'ragan xodimning bot chatiga (ADR 0008 §5) — `notifications` navbati orqali. */
@Injectable()
export class ReportsDeliveryService {
  constructor(
    @Inject(ReportsService) private readonly reports: ReportsService,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
  ) {}

  async send(
    actor: RequestUser,
    type: ReportType,
    req: SendReportRequest,
    ctx: AuditContext,
  ): Promise<SendReportResult> {
    const { format, ...filter } = req;
    const id = createHash('sha256')
      .update(JSON.stringify([actor.id, type, format, filter.from, filter.to, filter.groupBy]))
      .digest('hex');
    const key = `reports:sent:${id}`;
    if ((await this.redis.set(key, '1', 'EX', REPEAT_TTL_S, 'NX')) !== 'OK')
      return { status: 'already_sent' };
    try {
      await this.deliver(actor, { type, format, filter }, ctx);
      return { status: 'queued' };
    } catch (err) {
      // Yuborilmadi — qayta bosish ishlashi kerak.
      await this.redis.del(key);
      throw err;
    }
  }

  private async deliver(
    actor: RequestUser,
    r: {
      type: ReportType;
      format: SendReportRequest['format'];
      filter: Omit<SendReportRequest, 'format'>;
    },
    ctx: AuditContext,
  ): Promise<void> {
    const file = await this.reports.exportReport(r.type, r.format, actor, r.filter);
    if (!(await this.notifications.hasTelegram(actor.id)))
      throw new AppException(HttpStatus.CONFLICT, 'NO_TELEGRAM');
    const stored = await this.files.ingest(
      file.buffer,
      { purpose: 'report_export', declaredMime: file.mimeType, uploadedBy: actor.id },
      ctx,
    );
    await this.notifications.notify({
      userId: actor.id,
      type: 'report_file',
      dedupeKey: `report-${uuidv7()}`,
      payload: {
        title: file.title,
        body: file.subtitle,
        fileId: stored.id,
        fileName: file.filename,
        fileType: 'document',
      },
    });
  }
}
