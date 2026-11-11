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
