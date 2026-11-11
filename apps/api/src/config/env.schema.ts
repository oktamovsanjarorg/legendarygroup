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
  /** Access JWT imzosi (HS256). */
  JWT_ACCESS_SECRET: z.string().min(32, 'kamida 32 belgi'),
  /** TOTP sirlarini shifrlash (AES-256-GCM): 32 bayt, hex. */
  TOTP_ENCRYPTION_KEY: z.string().regex(/^[0-9a-f]{64}$/i, '64 belgili hex (32 bayt)'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
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
