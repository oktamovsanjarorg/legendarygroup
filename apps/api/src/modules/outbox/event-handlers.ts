import { Inject, Injectable } from '@nestjs/common';
import type { EventEnvelope, EventType } from '@lg/contracts';
import { type Database, outboxConsumptions, type Transaction } from '@lg/db';
import { DB_TOKEN } from '../../common/db/db.tokens.js';

export type EventHandler<T extends EventType> = (
  event: EventEnvelope<T>,
  tx: Transaction,
) => Promise<void>;

interface Registration {
  consumer: string;
  handle: EventHandler<EventType>;
}

/**
 * Event iste'molchilari reyestri. Modul `onModuleInit`da ro'yxatdan o'tadi:
 * `handlers.on('PaymentConfirmed', 'notifications.receipt', (e, tx) => …)`.
 */
@Injectable()
export class EventHandlers {
  private readonly byType = new Map<EventType, Registration[]>();

  constructor(@Inject(DB_TOKEN) private readonly db: Database) {}

  on<T extends EventType>(type: T, consumer: string, handle: EventHandler<T>): void {
    const list = this.byType.get(type) ?? [];
    if (list.some((r) => r.consumer === consumer)) {
      throw new Error(`Takroriy iste'molchi: ${type}/${consumer}`);
    }
    list.push({ consumer, handle: handle as EventHandler<EventType> });
    this.byType.set(type, list);
  }

  /**
   * Har iste'molchi uchun: `outbox_consumptions` belgisi + handler — bitta tranzaksiyada.
   * Belgi allaqachon bor bo'lsa — o'tkazib yuboriladi (qayta yetkazilgan event).
   * Handler xatosi → tranzaksiya bekor → BullMQ qayta urinadi; muvaffaqiyatli iste'molchilar takrorlanmaydi.
   */
  async dispatch(event: EventEnvelope): Promise<void> {
    for (const { consumer, handle } of this.byType.get(event.type) ?? []) {
      await this.db.transaction(async (tx) => {
        const claimed = await tx
          .insert(outboxConsumptions)
          .values({ consumer, eventId: event.eventId })
          .onConflictDoNothing()
          .returning({ consumer: outboxConsumptions.consumer });
        if (claimed.length > 0) await handle(event, tx);
      });
    }
  }
}
