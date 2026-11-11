import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/** Bot env (yashirin standartsiz — xavfsizlik qiymatlari majburiy). */
export const botEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'staging', 'production']),
    TELEGRAM_BOT_TOKEN: z.string().regex(/^[0-9]+:[A-Za-z0-9_-]{20,}$/),
    /** Lokal — `polling`, staging/prod — `webhook` (03 §2). */
    BOT_MODE: z.enum(['polling', 'webhook']),
    TELEGRAM_BOT_WEBHOOK_SECRET: z
      .string()
      .regex(/^[A-Za-z0-9_-]{16,256}$/)
      .optional(),
    BOT_PORT: z.coerce.number().int().min(0).max(65535).default(3002),
    TELEGRAM_MINIAPP_URL: z.url(),
    REDIS_URL: z.url({ protocol: /^rediss?$/ }),
    LOG_LEVEL: z
      .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
      .default('info'),
  })
  .refine((e) => e.BOT_MODE !== 'webhook' || e.TELEGRAM_BOT_WEBHOOK_SECRET, {
    message: 'webhook rejimida TELEGRAM_BOT_WEBHOOK_SECRET majburiy',
    path: ['TELEGRAM_BOT_WEBHOOK_SECRET'],
  });

export type BotEnv = z.infer<typeof botEnvSchema>;

export function parseBotEnv(raw: Record<string, unknown>): BotEnv {
  const r = botEnvSchema.safeParse(raw);
  if (!r.success) {
    throw new Error(
      `[bot] Noto'g'ri konfiguratsiya:\n${r.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n')}`,
    );
  }
  return r.data;
}

/** Lokal: ildiz `.env` (bot DB paketiga bog'liq emas — o'z yuklovchisi). */
export function loadRootEnv(): void {
  const file = fileURLToPath(new URL('../../../.env', import.meta.url));
  if (existsSync(file)) process.loadEnvFile(file);
}
