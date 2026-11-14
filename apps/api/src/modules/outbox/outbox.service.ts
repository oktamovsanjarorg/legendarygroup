import { Inject, Injectable } from '@nestjs/common';
import type { EventPayloads, EventType } from '@lg/contracts';
import { type Database, outboxEvents, type Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

/**
 * Event nashr qilish (03 §4). Modullar event'ni **o'z biznes tranzaksiyasi ichida** yozadi:
 * tranzaksiya bekor bo'lsa — event ham yo'q; commit bo'lsa — worker uni albatta yetkazadi.
 */
@Injectable()
export class OutboxService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async publish<T extends EventType>(
    type: T,
    payload: EventPayloads[T],
    tx: Transaction | Database = this.db,
  ): Promise<string> {
    const [row] = await tx
      .insert(outboxEvents)
      .values({ type, payload: { ...payload }, nextAttemptAt: this.clock.now() })
      .returning({ id: outboxEvents.id });
    if (!row) throw new Error('outbox event yozilmadi');
    return row.id;
  }
}
