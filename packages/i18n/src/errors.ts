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
  FILE_TYPE_NOT_ALLOWED:
    'Bu turdagi faylni yuklab boʻlmaydi. Rasm (JPG, PNG, WEBP) yoki PDF tanlang.',
  FILE_TOO_LARGE: 'Fayl juda katta. Hajmi 10 MB dan oshmasin.',
  FILE_CONTENT_MISMATCH: 'Fayl mazmuni koʻrsatilgan turga mos emas. Asl faylni yuklang.',
  UPLOAD_NOT_FOUND: 'Yuklash muddati tugagan. Faylni qayta tanlang.',
  INVALID_INIT_DATA: 'Telegram maʼlumotlari tasdiqlanmadi. Ilovani bot orqali qayta oching.',
  TELEGRAM_NOT_LINKED:
    'Telegram akkauntingiz tizimga bogʻlanmagan. Botda /start bosing va telefon raqamingizni ulashing.',
  NON_DELEGABLE_PERMISSION: 'Bu ruxsat faqat Direktorga tegishli, uni Adminga berib boʻlmaydi.',
  OVERRIDE_NOT_ALLOWED: 'Bu ruxsatni ushbu xodimga berib yoki olib boʻlmaydi.',
  LAST_DIRECTOR: 'Oxirgi faol Direktorni bloklab yoki rolini olib boʻlmaydi.',
  ALREADY_STAFF: 'Bu xodimda shu rol allaqachon bor.',
  USER_BLOCKED: 'Foydalanuvchi bloklangan. Avval blokdan chiqaring.',
  INVITE_NOT_NEEDED: 'Taklif kerak emas: xodim allaqachon tizimga kira oladi.',
  NOT_BLOCKED: 'Foydalanuvchi bloklanmagan.',
  COURSE_NAME_TAKEN: 'Bu nomdagi faol kurs allaqachon bor. Boshqa nom tanlang.',
  ROOM_NAME_TAKEN: 'Bu nomdagi faol xona allaqachon bor. Boshqa nom tanlang.',
  ALREADY_ARCHIVED: 'Bu yozuv allaqachon arxivda.',
  NOT_ARCHIVED: 'Bu yozuv arxivda emas.',
  ARCHIVED_READ_ONLY: 'Arxivdagi yozuvni tahrirlab boʻlmaydi. Avval arxivdan chiqaring.',
} as const;

export type ErrorCode = keyof typeof errorMessages;

export const isErrorCode = (code: string): code is ErrorCode => Object.hasOwn(errorMessages, code);
