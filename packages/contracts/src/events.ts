/**
 * Domen event'lari (03 §4, transactional outbox). Nom — `PascalCase` o'tgan zamon
 * (`PaymentConfirmed`), payload — faqat ID'lar va zarur qiymatlar (12-ai-playbook.md §5).
 * Yangi event turi shu yerga qo'shiladi: `EVENT_TYPES` + `EventPayloads`.
 */
export const EVENT_TYPES = [
  // T-005: infratuzilma tekshiruvi (smoke) uchun.
  'SystemHeartbeat',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EventPayloads {
  SystemHeartbeat: { at: string };
}

/** Navbatdagi job ma'lumoti — outbox qatoridan. */
export interface EventEnvelope<T extends EventType = EventType> {
  eventId: string;
  type: T;
  payload: EventPayloads[T];
  occurredAt: string;
}
