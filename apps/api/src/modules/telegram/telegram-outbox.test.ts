import { Job } from 'bullmq';
import { describe, expect, it } from 'vitest';
import type { QueueService } from '../../common/queue/queue.service.js';
import { TelegramOutbox } from './telegram-outbox.service.js';

/** BullMQ'ning o'z tekshiruvi bilan (Job.validateOptions): navbatga real qo'shishdagi xato. */
function fakeQueues() {
  const added: { id: string | undefined }[] = [];
  const queue = {
    add: async (name: string, data: unknown, opts: { jobId?: string }) => {
      // Faqat opsiyalar tekshiruvi (Redis'siz): Job'ning o'z validateOptions'i.
      const job = Object.assign(Object.create(Job.prototype) as Job, { opts, name, data });
      (job as unknown as { validateOptions(d: unknown): void }).validateOptions(data);
      added.push({ id: opts.jobId });
      return { id: opts.jobId };
    },
  };
  return { queues: { queue: () => queue } as unknown as QueueService, added };
}

describe('TelegramOutbox dedupe (BullMQ 6 jobId qoidasi)', () => {
  it("ko'p qismli kalit (att:lesson:student:guardian) — navbatga tushadi, xato emas", async () => {
    const { queues, added } = fakeQueues();
    const outbox = new TelegramOutbox(queues);
    const msg = { method: 'sendMessage' as const, chatId: '1', payload: { text: 'x' } };
    await outbox.enqueue(msg, { dedupeKey: 'att:L1:S1:G1' });
    await outbox.enqueue(msg, { dedupeKey: 'weekly:2026-11-09:S1:G1' });
    expect(added).toHaveLength(2);
    // Deterministik: bir xil kalit — bir xil jobId (takror xabar ketmaydi).
    await outbox.enqueue(msg, { dedupeKey: 'att:L1:S1:G1' });
    expect(added[2]?.id).toBe(added[0]?.id);
  });
});
