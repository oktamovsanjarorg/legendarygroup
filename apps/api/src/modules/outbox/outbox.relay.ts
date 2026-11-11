import { Inject, Injectable, Logger } from '@nestjs/common';
import type { EventEnvelope, EventType } from '@lg/contracts';
import { type Database, outboxEvents, type Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { and, asc, eq, isNull, lte } from 'drizzle-orm';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { QUEUES, QueueService, RETRY } from '../../common/queue/queue.service.js';

export const RELAY_BATCH = 100;
export const RELAY_MAX_ATTEMPTS = 10;
/** Yakunlangan job Redis'da 7 kun saqlanadi — shu davrda bir xil jobId qayta qo'shilmaydi. */
const KEEP_COMPLETED_S = 7 * 24 * 60 * 60;

type OutboxRow = typeof outboxEvents.$inferSelect;

/** n-urinishdan keyingi kutish: 1s·2ⁿ⁻¹ (1, 2, 4, … s). */
export const relayBackoffMs = (attempts: number): number => 1000 * 2 ** Math.max(0, attempts - 1);

/**
 * Outbox → BullMQ relay (T-005). Bir tranzaksiyada navbatdagi qatorlarni
 * `FOR UPDATE SKIP LOCKED` bilan oladi (bir nechta worker bir-biriga xalaqit bermaydi),
 * `jobId = event id` bilan navbatga qo'yadi (takror qo'shilmaydi) va `processed_at` belgilaydi.
 * Redis xatosida — qator bo'yicha backoff; 10 urinishdan keyin `failed_at` + alert.
 */
@Injectable()
export class OutboxRelay {
  private readonly logger = new Logger(OutboxRelay.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(QueueService) private readonly queues: QueueService,
  ) {}

  /** Bitta partiya; qaytaradi: navbatga uzatilgan event'lar soni. */
  async relayOnce(): Promise<number> {
    return this.db.transaction(async (tx) => {
      const now = this.clock.now();
      const due = await tx
        .select()
        .from(outboxEvents)
        .where(
          and(
            isNull(outboxEvents.processedAt),
            isNull(outboxEvents.failedAt),
            lte(outboxEvents.nextAttemptAt, now),
          ),
        )
        .orderBy(asc(outboxEvents.nextAttemptAt))
        .limit(RELAY_BATCH)
        .for('update', { skipLocked: true });

      let relayed = 0;
      for (const row of due) {
        relayed += (await this.relayRow(tx, row, now)) ? 1 : 0;
      }
      return relayed;
    });
  }

  private async relayRow(tx: Transaction, row: OutboxRow, now: Date): Promise<boolean> {
    const envelope: EventEnvelope = {
      eventId: row.id,
      type: row.type as EventType,
      payload: row.payload as EventEnvelope['payload'],
      occurredAt: row.createdAt.toISOString(),
    };
    try {
      await this.queues.queue(QUEUES.events).add(row.type, envelope, {
        jobId: row.id,
        ...RETRY,
        removeOnComplete: { age: KEEP_COMPLETED_S },
        removeOnFail: false,
      });
      await tx.update(outboxEvents).set({ processedAt: now }).where(eq(outboxEvents.id, row.id));
      return true;
    } catch (err) {
      await this.recordFailure(tx, row, now, err);
      return false;
    }
  }

  private async recordFailure(tx: Transaction, row: OutboxRow, now: Date, err: unknown) {
    const attempts = row.attempts + 1;
    const exhausted = attempts >= RELAY_MAX_ATTEMPTS;
    const message = err instanceof Error ? err.message : String(err);
    await tx
      .update(outboxEvents)
      .set({
        attempts,
        lastError: message.slice(0, 1000),
        nextAttemptAt: new Date(now.getTime() + relayBackoffMs(attempts)),
        failedAt: exhausted ? now : null,
      })
      .where(eq(outboxEvents.id, row.id));
    if (exhausted) {
      // ALERT: monitoring (T-016) `alert: true` yozuvlarini texnik chatga yuboradi.
      this.logger.error(
        { alert: true, eventId: row.id, type: row.type, err },
        'Outbox dead-letter',
      );
    } else {
      this.logger.warn(
        { eventId: row.id, attempts, err: message },
        'Outbox relay xatosi, qayta urinadi',
      );
    }
  }
}
