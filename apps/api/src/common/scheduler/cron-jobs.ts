import { Injectable } from '@nestjs/common';

export const CRON_TIMEZONE = 'Asia/Tashkent';

export interface CronJob {
  /** Barqaror ID (`billing.month-close`) — BullMQ job scheduler kaliti. */
  id: string;
  /** Cron ifodasi, `Asia/Tashkent` vaqtida (masalan `5 0 1 * *` — oyning 1-sanasi 00:05). */
  pattern: string;
  /** Qayta ishga tushirish xavfsiz bo'lishi SHART (CLAUDE.md "Idempotentlik"). */
  run: () => Promise<void>;
}

/**
 * Takrorlanuvchi vazifalar reyestri (03 §3: "BullMQ repeatable jobs, bitta joyda").
 * Modul `onModuleInit`da `cron.register({...})`; worker ishga tushganda ularni BullMQ'ga
 * `upsertJobScheduler` bilan yozadi va reyestrda yo'qlarini o'chiradi.
 */
@Injectable()
export class CronJobs {
  private readonly jobs = new Map<string, CronJob>();

  register(job: CronJob): void {
    if (this.jobs.has(job.id)) throw new Error(`Takroriy cron ID: ${job.id}`);
    this.jobs.set(job.id, job);
  }

  get(id: string): CronJob | undefined {
    return this.jobs.get(id);
  }

  all(): CronJob[] {
    return [...this.jobs.values()];
  }
}
