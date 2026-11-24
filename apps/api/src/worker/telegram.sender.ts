import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DelayedError, type Job, UnrecoverableError, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { QUEUES, QueueService } from '../common/queue/queue.service.js';
import { REDIS_TOKEN } from '../common/redis/redis.tokens.js';
import { EnvService } from '../config/env.service.js';
import { FilesService } from '../modules/files/index.js';
import { NotificationsService } from '../modules/notifications/index.js';
import { OutboxService } from '../modules/outbox/index.js';
import type { TelegramMessage } from '../modules/telegram/index.js';
import { attachDeadLetter } from './dead-letter.js';

/** FR-RPT-6: umumiy ≤ 25 xabar/s (Telegram limiti ~30), bitta chatga ≤ 1 xabar/s. */
export const GLOBAL_LIMIT = { max: 25, duration: 1000 } as const;
export const PER_CHAT_INTERVAL_MS = 1000;

interface TelegramResponse {
  ok: boolean;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
}

/**
 * Telegram yuboruvchi (T-010). Javoblar:
 * - 429 → `retry_after` davomida butun navbat to'xtatiladi (urinish sanalmaydi);
 * - 403 (bloklangan/o'chirilgan) → `TelegramChatBlocked` event, qayta urinilmaydi;
 * - boshqa 4xx → qayta urinilmaydi (dead-letter);
 * - 5xx/tarmoq → backoff bilan qayta urinish.
 */
@Injectable()
export class TelegramSender implements OnApplicationBootstrap {
  private readonly logger = new Logger(TelegramSender.name);
  private readonly apiBase: string;
  private worker: Worker | undefined;

  constructor(
    @Inject(EnvService) env: EnvService,
    @Inject(QueueService) private readonly queues: QueueService,
    @Inject(REDIS_TOKEN) private readonly redis: Redis,
    @Inject(OutboxService) private readonly outbox: OutboxService,
    @Inject(NotificationsService) private readonly notifications: NotificationsService,
    @Inject(FilesService) private readonly files: FilesService,
  ) {
    this.apiBase = `${env.get('TELEGRAM_API_URL')}/bot${env.get('TELEGRAM_BOT_TOKEN')}`;
  }

  onApplicationBootstrap(): void {
    this.worker = this.queues.worker(QUEUES.telegram, (job, token) => this.process(job, token), {
      limiter: GLOBAL_LIMIT,
      concurrency: 5,
    });
    attachDeadLetter(this.worker, this.queues, this.logger);
    this.worker.on('failed', (job, err) => void this.onFinalFailure(job, err));
  }

  /** T-109: urinishlar tugagan bildirishnoma — `TelegramSendFailed` (W-22 da `failed`). */
  private async onFinalFailure(job: Job<TelegramMessage> | undefined, err: Error): Promise<void> {
    const id = job?.data.notificationId;
    if (!job || !id) return;
    const exhausted = job.attemptsMade >= (job.opts.attempts ?? 1);
    if (!exhausted && err.name !== 'UnrecoverableError') return;
    await this.outbox
      .publish('TelegramSendFailed', { notificationId: id, error: err.message.slice(0, 500) })
      .catch((e: unknown) => this.logger.error({ err: e }, 'TelegramSendFailed yozilmadi'));
  }

  private async process(job: Job<TelegramMessage>, token?: string): Promise<unknown> {
    const { chatId, method } = job.data;
    // Bitta chatga sekundiga bitta: band bo'lsa — 1 s ga kechiktiriladi (urinish sanalmaydi).
    const free = await this.redis.set(`tg:chat:${chatId}`, '1', 'PX', PER_CHAT_INTERVAL_MS, 'NX');
    if (free !== 'OK') {
      await job.moveToDelayed(Date.now() + PER_CHAT_INTERVAL_MS, token);
      throw new DelayedError();
    }

    const res = await fetch(`${this.apiBase}/${method}`, {
      method: 'POST',
      ...(await this.requestBody(job.data)),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({ ok: false }))) as TelegramResponse;
    if (body.ok) {
      await this.markSent(job.data.notificationId);
      return { status: 'sent' };
    }
    return this.handleError(res.status, body, chatId);
  }

  /** JSON yoki (fayl bo'lsa) multipart: maydon nomi usuldan — `sendPhoto` → `photo`. */
  private async requestBody({ chatId, method, payload, file }: TelegramMessage) {
    if (!file)
      return {
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, ...payload }),
      };
    const stored = await this.files.readForDelivery(file.id);
    if (!stored) throw new UnrecoverableError('FILE_NOT_FOUND');
    const form = new FormData();
    form.append('chat_id', chatId);
    for (const [key, value] of Object.entries(payload)) form.append(key, String(value));
    form.append(
      method === 'sendPhoto' ? 'photo' : 'document',
      new Blob([new Uint8Array(stored.body)], { type: stored.mime }),
      file.name,
    );
    return { body: form };
  }

  /** Xabar Telegram'da — holat yozilmasa ham qayta yuborilmaydi (takroriy xabar bo'lmasin). */
  private async markSent(notificationId: string | undefined): Promise<void> {
    if (!notificationId) return;
    await this.notifications
      .markSent(notificationId)
      .catch((e: unknown) => this.logger.error({ err: e }, 'bildirishnoma `sent` qilinmadi'));
  }

  private async handleError(
    status: number,
    body: TelegramResponse,
    chatId: string,
  ): Promise<unknown> {
    const description = body.description ?? `HTTP ${status}`;
    if (status === 429) {
      const ms = (body.parameters?.retry_after ?? 1) * 1000;
      await this.worker?.rateLimit(ms);
      throw Worker.RateLimitError();
    }
    if (status === 403) {
      await this.outbox.publish('TelegramChatBlocked', { chatId, description });
      return { status: 'blocked' };
    }
    if (status >= 400 && status < 500)
      throw new UnrecoverableError(`Telegram ${status}: ${description}`);
    throw new Error(`Telegram ${status}: ${description}`);
  }
}
