/**
 * API xato kodlari → foydalanuvchiga ko'rinadigan matn.
 * Kod — `SCREAMING_SNAKE` (12-ai-playbook.md §5). Matn nima qilish kerakligini aytadi (11-ux.md §3).
 */
export const errorMessages = {
  BAD_REQUEST: 'Soʻrov notoʻgʻri. Maʼlumotlarni tekshirib, qayta urinib koʻring.',
  VALIDATION_ERROR: 'Kiritilgan maʼlumotlarda xato bor. Belgilangan maydonlarni tuzating.',
  UNAUTHORIZED: 'Tizimga qayta kiring.',
  FORBIDDEN: 'Bu amal uchun ruxsatingiz yoʻq.',
  NOT_FOUND: 'Maʼlumot topilmadi.',
  CONFLICT: 'Maʼlumot boshqa amal bilan oʻzgargan. Sahifani yangilang.',
  UNPROCESSABLE_ENTITY: 'Soʻrovni bajarib boʻlmadi. Maʼlumotlarni tekshiring.',
  TOO_MANY_REQUESTS: 'Juda koʻp urinish. Birozdan keyin qayta urinib koʻring.',
  SERVICE_UNAVAILABLE: 'Xizmat vaqtincha ishlamayapti. Birozdan keyin urinib koʻring.',
  INTERNAL_SERVER_ERROR: 'Kutilmagan xato yuz berdi. Birozdan keyin qayta urinib koʻring.',
  HTTP_ERROR: 'Soʻrovni bajarib boʻlmadi.',
  INVALID_IDEMPOTENCY_KEY: 'Soʻrov kaliti notoʻgʻri. Sahifani yangilab, qayta urinib koʻring.',
  IDEMPOTENCY_CONFLICT: 'Bu soʻrov boshqa maʼlumotlar bilan allaqachon yuborilgan.',
  IDEMPOTENCY_IN_PROGRESS:
    'Soʻrov hali bajarilmoqda. Bir necha soniyadan keyin natijani tekshiring.',
  INVALID_INTERNAL_TOKEN: 'Ichki xizmat tokeni notoʻgʻri.',
  INVALID_CREDENTIALS: 'Telefon raqam yoki parol notoʻgʻri.',
  ACCOUNT_BLOCKED: 'Hisobingiz bloklangan. Markaz rahbariyatiga murojaat qiling.',
  INVALID_MFA_TOKEN: 'Kirish muddati tugadi. Telefon va parolni qayta kiriting.',
  INVALID_TOTP: 'Tasdiqlash kodi notoʻgʻri. Ilovadagi yangi kodni kiriting.',
  TOTP_ALREADY_ENABLED: 'Ikki bosqichli himoya allaqachon yoqilgan.',
  SESSION_EXPIRED: 'Sessiya tugadi. Tizimga qayta kiring.',
  SESSION_REVOKED: 'Xavfsizlik uchun barcha qurilmalardan chiqarildingiz. Qayta kiring.',
  INVALID_INVITE: 'Taklif havolasi yaroqsiz yoki muddati oʻtgan. Yangi havola soʻrang.',
  TELEGRAM_LOGIN_PENDING: 'Telegramdagi tasdiqlash kutilmoqda.',
  ROLE_NOT_ASSIGNED: 'Sizda bu rol yoʻq.',
} as const;

export type ErrorCode = keyof typeof errorMessages;

export const isErrorCode = (code: string): code is ErrorCode => Object.hasOwn(errorMessages, code);
