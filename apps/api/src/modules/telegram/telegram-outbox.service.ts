import { Inject, Injectable } from '@nestjs/common';
import { QUEUES, QueueService } from '../../common/queue/queue.service.js';

/** Telegram Bot API usuli va uning parametrlari (faqat ishlatiladiganlar). */
export interface TelegramMessage {
  method: 'sendMessage' | 'sendDocument' | 'sendPhoto' | 'editMessageText';
  chatId: string;
  payload: Record<string, unknown>;
}

export const SEND_ATTEMPTS = 8;

/**
 * Chiquvchi Telegram xabarlari navbati (CLAUDE.md: xabar yuborish faqat navbat orqali).
 * Odatda `notifications` moduli (T-109) chaqiradi. `dedupeKey` — bir hodisa uchun bitta xabar
 * (masalan `attendance:<lessonId>:<studentId>`), BullMQ `jobId` sifatida.
 */
@Injectable()
export class TelegramOutbox {
  constructor(@Inject(QueueService) private readonly queues: QueueService) {}

  async enqueue(
    message: TelegramMessage,
    opts: { dedupeKey?: string; delayMs?: number } = {},
  ): Promise<string> {
    const job = await this.queues.queue(QUEUES.telegram).add(message.method, message, {
      jobId: opts.dedupeKey,
      delay: opts.delayMs,
      attempts: SEND_ATTEMPTS,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { age: 7 * 24 * 60 * 60 },
      removeOnFail: false,
    });
    return job.id ?? '';
  }
}
