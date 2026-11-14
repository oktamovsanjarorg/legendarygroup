import { z } from 'zod';

/**
 * Ilova env sxemasi. Xavfsizlikka ta'sir qiladigan qiymatlarda standart yo'q
 * (CLAUDE.md "Yashirin standart qiymat yo'q"): ular berilmasa ilova ishga tushmaydi.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  REDIS_URL: z.url({ protocol: /^rediss?$/ }),
  INTERNAL_API_TOKEN: z.string().min(32, 'kamida 32 belgi'),
  /** Bot tokeni — Mini App `initData` imzosini tekshirish (FR-AUTH-2) va bot (T-010). */
  TELEGRAM_BOT_TOKEN: z.string().regex(/^[0-9]+:[A-Za-z0-9_-]{20,}$/, 'BotFather tokeni formatida'),
  /** Bot username (`@`siz) — ustoz taklif havolasi `t.me/<bot>?start=inv_<token>` (T-101). */
  TELEGRAM_BOT_USERNAME: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9_]{3,30}bot$/i, 'BotFather username (…bot)'),
  /** Web panel ommaviy manzili — taklif havolasi `<url>/invite/<token>` (T-101, CLI). */
  PUBLIC_APP_URL: z.url({ protocol: /^https?$/ }),
  /** Bot API manzili (testlarda soxta server). */
  TELEGRAM_API_URL: z.url().default('https://api.telegram.org'),
  /** Access JWT imzosi (HS256). */
  JWT_ACCESS_SECRET: z.string().min(32, 'kamida 32 belgi'),
  /** TOTP sirlarini shifrlash (AES-256-GCM): 32 bayt, hex. */
  TOTP_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, '64 belgili hex (32 bayt)'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  /** S3 (prod — AWS, lokal — MinIO). Kalitlar bo'lmasa — SDK standart zanjiri (EC2 IAM roli). */
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1),
  S3_BUCKET_FILES: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
  S3_FORCE_PATH_STYLE: z.stringbool().default(false),
  /** BullMQ kalitlari prefiksi (testlarda izolyatsiya uchun o'zgartiriladi). */
  QUEUE_PREFIX: z
    .string()
    .regex(/^[a-z0-9_-]{1,32}$/)
    .default('lg'),
  /** Worker: Bull Board va monitoring porti (faqat ichki tarmoq). */
  WORKER_PORT: z.coerce.number().int().min(0).max(65535).default(3001),
  /** Worker'da majburiy (`requireWorkerEnv`); API jarayoniga kerak emas. */
  BULL_BOARD_USER: z.string().min(3).optional(),
  BULL_BOARD_PASSWORD: z.string().min(16, 'kamida 16 belgi').optional(),
  /** Vergul bilan ajratilgan originlar ro'yxati. */
  CORS_ORIGINS: z
    .string()
    .min(1)
    .transform((s) =>
      s
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.url()).min(1)),
});

export type EnvConfig = z.infer<typeof envSchema>;

/** Noto'g'ri env'da xato tashlaydi — ilova ishga tushmaydi. Xabarda qiymatlar (sirlar) chiqmaydi. */
export function validateEnv(rawEnv: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[config] Noto'g'ri konfiguratsiya:\n${issues}`);
  }
  return result.data;
}
