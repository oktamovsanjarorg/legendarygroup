import { Logger } from '@nestjs/common';
import { bootstrapWorker } from '@lg/api';
import { loadRootEnv } from '@lg/db';

const logger = new Logger('Worker');

async function main(): Promise<void> {
  loadRootEnv(); // lokal: ildiz .env; staging/prod — muhit o'zgaruvchilari
  await bootstrapWorker();
  logger.log("Worker ishga tushdi: outbox relay, iste'molchilar, cron, Bull Board");
}

main().catch((err: unknown) => {
  logger.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
