import type { Logger } from '@nestjs/common';
import type { Job, Worker } from 'bullmq';
import { QUEUES, type QueueService } from '../common/queue/queue.service.js';

export interface DeadLetterData {
  queue: string;
  name: string;
  data: unknown;
  error: string;
  attemptsMade: number;
  failedAt: string;
}

/**
 * Barcha urinishlari tugagan job → `dead-letter` navbati (qo'lda ko'rib chiqish, Bull Board'da
 * ko'rinadi) + alert. Asl job ham `failed` holatida saqlanadi (`removeOnFail: false`).
 */
export function attachDeadLetter(worker: Worker, queues: QueueService, logger: Logger): void {
  worker.on('failed', (job: Job | undefined, err: Error) => {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
    const data: DeadLetterData = {
      queue: worker.name,
      name: job.name,
      data: job.data,
      error: err.message.slice(0, 2000),
      attemptsMade: job.attemptsMade,
      failedAt: new Date(job.finishedOn ?? job.processedOn ?? 0).toISOString(),
    };
    queues
      .queue(QUEUES.deadLetter)
      .add(job.name, data, { jobId: `${worker.name}__${job.id ?? job.name}`, removeOnFail: false })
      .catch((e: unknown) => logger.error({ err: e }, "Dead-letter'ga yozilmadi"));
    // ALERT: monitoring (T-016) `alert: true` yozuvlarini texnik chatga yuboradi.
    logger.error({ alert: true, queue: worker.name, jobId: job.id, err }, 'Job dead-letter');
  });
}
