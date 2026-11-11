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
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
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
