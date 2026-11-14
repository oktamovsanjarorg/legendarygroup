import Fastify, { type FastifyInstance } from 'fastify';
import { type Bot, webhookCallback } from 'grammy';

export const WEBHOOK_PATH = '/bot/webhook';

/**
 * Webhook serveri (Caddy: `/bot/webhook` → bot). Telegram `X-Telegram-Bot-Api-Secret-Token`
 * bilan keladi — mos kelmasa 401 (grammY `secretToken`). `/health/live` — konteyner healthcheck.
 */
export function createWebhookServer(bot: Bot, secretToken: string): FastifyInstance {
  const app = Fastify({ logger: false });
  app.get('/health/live', async () => ({ status: 'ok' }));
  app.post(WEBHOOK_PATH, webhookCallback(bot, 'fastify', { secretToken }));
  return app;
}

/**
 * Telegram'ga webhook manzilini aytadi (`setWebhook`, `secret_token` bilan). Har ishga tushishda
 * chaqiriladi — idempotent: manzil/sir o'zgarsa yangilanadi, navbatdagi update'lar saqlanadi.
 * Telegram faqat HTTPS qabul qiladi — http bo'lsa (lokal) o'tkazib yuboriladi, `false` qaytadi.
 */
export async function registerWebhook(
  bot: Bot,
  url: string,
  secretToken: string,
): Promise<boolean> {
  if (new URL(url).protocol !== 'https:') return false;
  await bot.api.setWebhook(url, { secret_token: secretToken, drop_pending_updates: false });
  return true;
}
