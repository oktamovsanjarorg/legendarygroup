import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'lg:audit';
export const NO_AUDIT_KEY = 'lg:noAudit';

export interface AuditMeta {
  /** `<entity>.<verb>`, masalan `course.create`. */
  action: string;
  entity: string;
}

/**
 * Yozish endpoint'i audit'i (FR-AUD-1): muvaffaqiyatli javobdan keyin `after` = javob (sirlar
 * yashirilgan), `entityId` = `:id` parametri yoki javobdagi `id`. `before` kerak bo'lsa —
 * service ichida `AuditService.record()` bilan yoziladi va endpoint `@NoAudit(...)`.
 */
export const Audit = (meta: AuditMeta) => SetMetadata(AUDIT_KEY, meta);

/** Audit boshqa joyda yoziladi (service ichida) — sababi majburiy (CI tekshiradi). */
export const NoAudit = (reason: string) => SetMetadata(NO_AUDIT_KEY, reason);
