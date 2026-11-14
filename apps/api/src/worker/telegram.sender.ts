import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { DelayedError, type Job, UnrecoverableError, Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { QUEUES, QueueService } from '../common/queue/queue.service.js';
import { REDIS_TOKEN } from '../common/redis/redis.tokens.js';
import { EnvService } from '../config/env.service.js';
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
  ) {
    this.apiBase = `${env.get('TELEGRAM_API_URL')}/bot${env.get('TELEGRAM_BOT_TOKEN')}`;
  }

  onApplicationBootstrap(): void {
    this.worker = this.queues.worker(QUEUES.telegram, (job, token) => this.process(job, token), {
      limiter: GLOBAL_LIMIT,
      concurrency: 5,
    });
    attachDeadLetter(this.worker, this.queues, this.logger);
  }

  private async process(job: Job<TelegramMessage>, token?: string): Promise<unknown> {
    const { chatId, method, payload } = job.data;
    // Bitta chatga sekundiga bitta: band bo'lsa — 1 s ga kechiktiriladi (urinish sanalmaydi).
    const free = await this.redis.set(`tg:chat:${chatId}`, '1', 'PX', PER_CHAT_INTERVAL_MS, 'NX');
    if (free !== 'OK') {
      await job.moveToDelayed(Date.now() + PER_CHAT_INTERVAL_MS, token);
      throw new DelayedError();
    }

    const res = await fetch(`${this.apiBase}/${method}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, ...payload }),
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => ({ ok: false }))) as TelegramResponse;
    if (body.ok) return { status: 'sent' };
    return this.handleError(res.status, body, chatId);
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
