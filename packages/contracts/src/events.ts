/**
 * Domen event'lari (03 §4, transactional outbox). Nom — `PascalCase` o'tgan zamon
 * (`PaymentConfirmed`), payload — faqat ID'lar va zarur qiymatlar (12-ai-playbook.md §5).
 * Yangi event turi shu yerga qo'shiladi: `EVENT_TYPES` + `EventPayloads`.
 */
export const EVENT_TYPES = [
  // T-005: infratuzilma tekshiruvi (smoke) uchun.
  'SystemHeartbeat',
  // T-006: "Telegram orqali kirish" — bot xodimga tasdiq tugmasini yuboradi (T-010/T-109).
  'StaffTelegramLoginRequested',
  // T-006: refresh token qayta ishlatildi (o'g'irlik belgisi) — xodimga ogohlantirish.
  'StaffSessionReuseDetected',
  // T-010: foydalanuvchi botni bloklagan (403) — T-109 bildirishnomani `blocked` qiladi, Admin ko'radi.
  'TelegramChatBlocked',
  // T-302: Test natijalari e'lon qilindi — ota-onaga xabar (T-109/T-302).
  'TestResultsPublished',
  // T-113: Davomat belgilandi — BR-31 3 daqiqalik tuzatish oynasidan keyin ota-onaga xabar.
  'AttendanceMarked',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EventPayloads {
  SystemHeartbeat: { at: string };
  StaffTelegramLoginRequested: { challengeId: string; userId: string; expiresAt: string };
  StaffSessionReuseDetected: { userId: string; familyId: string };
  TelegramChatBlocked: { chatId: string; description: string };
  TestResultsPublished: { testId: string; groupId: string; title: string };
  AttendanceMarked: {
    lessonId: string;
    studentId: string;
    status: string;
    lateMinutes: number | null;
    previousStatus: string | null;
    markedAt: string;
  };
}

/** Navbatdagi job ma'lumoti — outbox qatoridan. */
export interface EventEnvelope<T extends EventType = EventType> {
  eventId: string;
  type: T;
  payload: EventPayloads[T];
  occurredAt: string;
}
