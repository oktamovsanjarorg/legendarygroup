import { Logger } from '@nestjs/common';
import { loadRootEnv } from '@lg/db';
import { createApp } from './app.factory.js';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  loadRootEnv(); // lokal: ildiz .env; staging/prod — muhit o'zgaruvchilari (fayl yo'q)
  const { app, env } = await createApp();
  await app.listen({ port: env.get('PORT'), host: '0.0.0.0' });
  logger.log(`API ishga tushdi: port ${env.get('PORT')}`);
}

bootstrap().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
