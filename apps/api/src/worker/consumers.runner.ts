import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import type { EventEnvelope } from '@lg/contracts';
import { CRON_TIMEZONE, CronJobs } from '../common/scheduler/cron-jobs.js';
import { QUEUES, QueueService } from '../common/queue/queue.service.js';
import {
  AttendanceNoticeProcessor,
  type AttendanceNoticeJobData,
} from '../modules/attendance/index.js';
import { EventHandlers } from '../modules/outbox/index.js';
import { attachDeadLetter } from './dead-letter.js';

/** Cron job'lar uchun qisqaroq qayta urinish: keyingi rejali ishga tushish baribir keladi. */
const CRON_RETRY = { attempts: 3, backoff: { type: 'exponential', delay: 5000 } } as const;

/**
 * Worker iste'molchilari: `events` (domen event'lari), `attendanceNotice` va `cron`.
 * Hammasida urinishlar tugasa — dead-letter + alert.
 */
@Injectable()
export class ConsumersRunner implements OnApplicationBootstrap {
  private readonly logger = new Logger(ConsumersRunner.name);

  constructor(
    @Inject(QueueService) private readonly queues: QueueService,
    @Inject(EventHandlers) private readonly handlers: EventHandlers,
    @Inject(CronJobs) private readonly cron: CronJobs,
    @Inject(AttendanceNoticeProcessor)
    private readonly attNoticeProcessor: AttendanceNoticeProcessor,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const events = this.queues.worker(QUEUES.events, (job) =>
      this.handlers.dispatch(job.data as EventEnvelope),
    );
    attachDeadLetter(events, this.queues, this.logger);

    const attNotice = this.queues.worker(QUEUES.attendanceNotice, async (job) => {
      await this.attNoticeProcessor.process(job.data as AttendanceNoticeJobData);
    });
    attachDeadLetter(attNotice, this.queues, this.logger);

    await this.syncSchedulers();
    const cron = this.queues.worker(QUEUES.cron, async (job) => {
      const def = this.cron.get(job.name);
      if (!def) throw new Error(`Ro'yxatda yo'q cron: ${job.name}`);
      await def.run();
    });
    attachDeadLetter(cron, this.queues, this.logger);
  }

  /** Reyestr → BullMQ (upsert; idempotent). Reyestrda yo'q eski scheduler'lar o'chiriladi. */
  private async syncSchedulers(): Promise<void> {
    const queue = this.queues.queue(QUEUES.cron);
    const wanted = new Set(this.cron.all().map((j) => j.id));
    for (const job of this.cron.all()) {
      await queue.upsertJobScheduler(
        job.id,
        { pattern: job.pattern, tz: CRON_TIMEZONE },
        { name: job.id, opts: { ...CRON_RETRY, removeOnComplete: 100, removeOnFail: false } },
      );
    }
    for (const existing of await queue.getJobSchedulers()) {
      if (existing.key && !wanted.has(existing.key)) await queue.removeJobScheduler(existing.key);
    }
    this.logger.log(`Cron: ${wanted.size} ta vazifa ro'yxatda`);
  }
}
