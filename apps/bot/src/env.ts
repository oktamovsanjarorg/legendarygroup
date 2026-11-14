import { existsSync, readFileSync } from 'node:fs';
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
    /** API ichki manzili (`/internal/*` — faqat ichki tarmoq, T-101). */
    API_INTERNAL_URL: z.url({ protocol: /^https?$/ }),
    /** API bilan bir xil (`x-internal-token`). */
    INTERNAL_API_TOKEN: z.string().min(32, 'kamida 32 belgi'),
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

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const idx = trimmed.indexOf('=');
  if (idx <= 0) return null;
  const k = trimmed.slice(0, idx).trim();
  let v = trimmed.slice(idx + 1).trim();
  const hashIdx = v.indexOf(' #');
  if (hashIdx >= 0) v = v.slice(0, hashIdx).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  return [k, v];
}

/** Lokal: ildiz `.env` (bot DB paketiga bog'liq emas — o'z yuklovchisi). */
export function loadRootEnv(): void {
  const file = fileURLToPath(new URL('../../../.env', import.meta.url));
  if (!existsSync(file)) return;
  const lines = readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    const pair = parseEnvLine(line);
    if (pair) process.env[pair[0]] = pair[1];
  }
}
