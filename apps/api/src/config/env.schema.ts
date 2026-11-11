import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TZ: z.string().default('Asia/Tashkent'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL env kiritilishi shart'),
  REDIS_URL: z.string().min(1, 'REDIS_URL env kiritilishi shart'),
  INTERNAL_API_TOKEN: z
    .string()
    .min(16, 'INTERNAL_API_TOKEN env kamida 16 ta belgi boʻlishi shart'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(rawEnv: Record<string, unknown> = process.env): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`[config] Notoʻgʻri konfiguratsiya:\n${issues}`);
  }
  return result.data;
}
