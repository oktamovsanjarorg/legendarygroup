/**
 * E2E uchun API (Playwright `webServer`): vaqtinchalik migratsiya qilingan baza, seed,
 * TOTP yoqilgan xodimlar hovuzi va haqiqiy `createApp()` — HTTP portda.
 * Dev bazaga yozilmaydi. Baza nomi `lg_e2e_*`: Nest shutdown hook'i jarayonni darhol tugatadi,
 * shuning uchun oldingi ishga tushirishdan qolgan bazalar keyingi start'da o'chiriladi
 * (bir vaqtda ikkita e2e ishga tushirish qo'llab-quvvatlanmaydi).
 *
 * Majburiy env (standart qiymat yo'q): DATABASE_URL (server, admin), REDIS_URL,
 * E2E_API_PORT, E2E_FIXTURES_FILE (Playwright shu fayldan foydalanuvchilarni o'qiydi).
 */
import { writeFile } from 'node:fs/promises';
import { Logger } from '@nestjs/common';
import { closeDb, createDb, loadRootEnv, seed } from '@lg/db';
import { createTempDb, dropStaleTempDbs } from '@lg/db/testing';
import { createApp } from '../app.factory.js';
import { testEnv } from '../test/env.js';
import { createAttendanceFixtures } from './fixtures-attendance.js';
import { createBillingFixtures } from './fixtures-billing.js';
import { createE2eFixtures } from './fixtures.js';

const logger = new Logger('E2E');
const DB_PREFIX = 'lg_e2e';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env oʻrnatilmagan`);
  return v;
}

async function main(): Promise<void> {
  loadRootEnv();
  const port = required('E2E_API_PORT');
  const fixturesFile = required('E2E_FIXTURES_FILE');
  const redisUrl = required('REDIS_URL');

  const stale = await dropStaleTempDbs(DB_PREFIX);
  if (stale > 0) logger.log(`Eski e2e bazalari o'chirildi: ${stale}`);
  const tmp = await createTempDb(DB_PREFIX);
  await seed(tmp.url, { withTestDirector: false });
  const env = testEnv({ DATABASE_URL: tmp.url, REDIS_URL: redisUrl, PORT: port });

  const { app } = await createApp(env);
  const db = createDb(tmp.url, { max: 1 });
  const staff = await createE2eFixtures(db, env.get('TOTP_ENCRYPTION_KEY'));
  const billing = await createBillingFixtures(app, db);
  const fixtures = {
    ...staff,
    students: billing.students,
    attendance: await createAttendanceFixtures(app, db, {
      teacherId: staff.teacher.id,
      courseId: billing.courseId,
    }),
    // Faqat test tokeni (apps/api/src/test/env.ts) — e2e `initData` imzosi uchun.
    telegramBotToken: env.get('TELEGRAM_BOT_TOKEN'),
  };
  await closeDb(db);
  await writeFile(fixturesFile, JSON.stringify(fixtures, null, 2));

  await app.listen({ port: env.get('PORT'), host: '127.0.0.1' });
  logger.log(`E2E API: port ${port}, baza ${tmp.url.split('/').pop() ?? ''}`);
}

main().catch((err: unknown) => {
  logger.error(err instanceof Error ? (err.stack ?? err.message) : err);
  process.exit(1);
});
