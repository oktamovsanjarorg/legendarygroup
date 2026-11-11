import { Redis } from 'ioredis';
import { configureMenuButton, createBot } from './bot.js';
import { loadRootEnv, parseBotEnv } from './env.js';
import { createWebhookServer } from './server.js';

const log = {
  info: (msg: string) => console.info(JSON.stringify({ level: 'info', msg })),
  error: (obj: unknown, msg: string) =>
    console.error(
      JSON.stringify({ level: 'error', msg, err: String((obj as { err?: unknown }).err ?? obj) }),
    ),
};

async function main(): Promise<void> {
  loadRootEnv();
  const env = parseBotEnv(process.env);
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true });
  const bot = createBot({ env, store: redis, log });
  await bot.init();
  if (!(await configureMenuButton(bot, env.TELEGRAM_MINIAPP_URL))) {
    log.info("Menyu tugmasi o'rnatilmadi: Mini App URL HTTPS emas (lokal)");
  }

  const stop = async () => {
    await bot.stop().catch(() => undefined);
    await redis.quit().catch(() => undefined);
  };
  process.once('SIGTERM', () => void stop());
  process.once('SIGINT', () => void stop());

  if (env.BOT_MODE === 'webhook') {
    const server = createWebhookServer(bot, env.TELEGRAM_BOT_WEBHOOK_SECRET ?? '');
    await server.listen({ port: env.BOT_PORT, host: '0.0.0.0' });
    log.info(`Bot webhook rejimida: port ${env.BOT_PORT}`);
  } else {
    await bot.api.deleteWebhook();
    log.info(`Bot long polling rejimida: @${bot.botInfo.username}`);
    await bot.start({ drop_pending_updates: false });
  }
}

main().catch((err: unknown) => {
  log.error({ err }, 'Bot ishga tushmadi');
  process.exitCode = 1;
});
