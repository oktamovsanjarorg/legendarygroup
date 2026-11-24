import type { EventPayloads, EventType } from '@lg/contracts';
import { type Database, outboxEvents } from '@lg/db';
import { eq } from 'drizzle-orm';
import { EventHandlers } from '../modules/outbox/index.js';
import type { TestApp } from './test-app.js';

/** Yozilgan shu turdagi event'larni iste'molchilarga yetkazadi (worker'siz). Soni qaytadi. */
export async function dispatchEvents<T extends EventType>(
  t: TestApp,
  db: Database,
  type: T,
): Promise<number> {
  const rows = await db.select().from(outboxEvents).where(eq(outboxEvents.type, type));
  for (const r of rows)
    await t.app.get(EventHandlers).dispatch({
      eventId: r.id,
      type,
      payload: r.payload as EventPayloads[T],
      occurredAt: '2026-11-24T00:00:00.000Z',
    });
  return rows.length;
}
