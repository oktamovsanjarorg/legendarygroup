import { Inject, Injectable, Logger, type OnApplicationShutdown } from '@nestjs/common';
import { type Processor, Queue, Worker, type WorkerOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { EnvService } from '../../config/env.service.js';

/** Navbat nomlari — bitta joyda. */
export const QUEUES = {
  /** Outbox'dan kelgan domen event'lari (jobId = event id). */
  events: 'events',
  /** Barcha urinishlari tugagan job'lar (qo'lda ko'rib chiqish + alert). */
  deadLetter: 'dead-letter',
  /** Takrorlanuvchi (cron) vazifalar. */
  cron: 'cron',
  /** Telegram'ga chiquvchi xabarlar (T-010): limit 25/s, 429 retry_after, bloklash. */
  telegram: 'telegram',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

/** T-005 Aniqlik: backoff 1s·2ⁿ, maks. 10 urinish. */
export const RETRY = { attempts: 10, backoff: { type: 'exponential', delay: 1000 } } as const;

/**
 * BullMQ ulanishi va navbatlar. API ham, worker ham ishlatadi (API — faqat job qo'shish).
 * Redis ulanishi alohida: BullMQ `maxRetriesPerRequest: null` talab qiladi (health'dagi
 * oddiy klientdan farqli).
 */
@Injectable()
export class QueueService implements OnApplicationShutdown {
  private readonly logger = new Logger(QueueService.name);
  private readonly connection: Redis;
  private readonly prefix: string;
  private readonly queues = new Map<QueueName, Queue>();
  private readonly workers: Worker[] = [];

  constructor(@Inject(EnvService) env: EnvService) {
    this.connection = new Redis(env.get('REDIS_URL'), {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
    this.prefix = env.get('QUEUE_PREFIX');
  }

  queue(name: QueueName): Queue {
    let q = this.queues.get(name);
    if (!q) {
      q = new Queue(name, { connection: this.connection, prefix: this.prefix });
      this.queues.set(name, q);
    }
    return q;
  }

  /** Iste'molchi (faqat worker jarayonida). Yopilish `onApplicationShutdown`da. */
  worker(name: QueueName, processor: Processor, opts: Partial<WorkerOptions> = {}): Worker {
    const worker = new Worker(name, processor, {
      connection: this.connection,
      prefix: this.prefix,
      ...opts,
    });
    worker.on('error', (err) => this.logger.error({ err, queue: name }, 'BullMQ worker xatosi'));
    this.workers.push(worker);
    return worker;
  }

  allQueues(): Queue[] {
    return Object.values(QUEUES).map((n) => this.queue(n));
  }

  async onApplicationShutdown(): Promise<void> {
    // Avval iste'molchilar (joriy job tugashini kutadi), keyin navbatlar va ulanish.
    await Promise.allSettled(this.workers.map((w) => w.close()));
    await Promise.allSettled([...this.queues.values()].map((q) => q.close()));
    await this.connection.quit().catch(() => this.connection.disconnect());
  }
}
