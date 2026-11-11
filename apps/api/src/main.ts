import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.factory.js';

const ROOT_ENV = fileURLToPath(new URL('../../.env', import.meta.url));
if (existsSync(ROOT_ENV)) {
  process.loadEnvFile(ROOT_ENV);
}

async function bootstrap(): Promise<void> {
  const { app, env } = await createApp();
  const port = env.get('PORT');

  await app.listen({ port, host: '0.0.0.0' });
  console.info(`[api] Legendary Group API http://0.0.0.0:${port} da ishga tushdi`);
}

void bootstrap();
