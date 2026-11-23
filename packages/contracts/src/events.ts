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
  // T-109: bildirishnoma xabari barcha urinishlardan keyin yuborilmadi — `failed`, W-22 ko'rsatadi.
  'TelegramSendFailed',
  // T-302: Test natijalari e'lon qilindi — ota-onaga xabar (T-109/T-302).
  'TestResultsPublished',
  // T-113: Davomat belgilandi — BR-31 3 daqiqalik tuzatish oynasidan keyin ota-onaga xabar.
  'AttendanceMarked',
  // T-119: Director tasdiqlash so'rovi bo'yicha qaror qildi — so'rovchiga xabar.
  'ApprovalDecided',
  // Q-95: guruhga yozildi — billing joriy oy qatorini darhol yozadi (BR-3, BR-6).
  'EnrollmentCreated',
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EventPayloads {
  SystemHeartbeat: { at: string };
  StaffTelegramLoginRequested: { challengeId: string; userId: string; expiresAt: string };
  StaffSessionReuseDetected: { userId: string; familyId: string };
  TelegramChatBlocked: { chatId: string; description: string };
  TelegramSendFailed: { notificationId: string; error: string };
  TestResultsPublished: { testId: string; groupId: string; title: string };
  EnrollmentCreated: { enrollmentId: string; studentId: string };
  ApprovalDecided: {
    requestId: string;
    requestedBy: string;
    type: string;
    decision: 'approved' | 'rejected';
    note: string | null;
  };
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
