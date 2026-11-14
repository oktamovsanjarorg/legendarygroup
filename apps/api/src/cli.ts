import { parseArgs } from 'node:util';
import { closeDb, createDb, loadRootEnv, requireDatabaseUrl, runMigrations, seed } from '@lg/db';
import { SystemClock } from '@lg/domain';
import { ensureAppLogin } from './db-login.js';
import { createFirstDirector, FirstDirectorError } from './modules/rbac/first-director.js';

/**
 * Ma'muriy CLI (`pnpm cli <buyruq>`).
 *   director:create --phone +998901234567 --name "Ism Familiya"
 * Taklif havolasini chiqaradi (24 soat): `<PUBLIC_APP_URL>/invite/<token>`.
 */
const HELP = `Foydalanish:
  pnpm cli director:create --phone +998901234567 --name "Ism Familiya"
  node dist/cli.js db:migrate     (konteynerda: migratsiya + rollar seed'i + APP_DB_LOGIN login'i va lg_app)`;

/**
 * Deploy bosqichi (T-011, compose `migrate` servisi): migratsiyalar → rollar/ruxsatlar seed'i
 * (test direktorsiz) → ilova login'i (`APP_DB_PASSWORD` bilan yaratiladi/yangilanadi) va
 * `lg_app` guruh roli. Hammasi idempotent.
 * `DATABASE_URL` — jadval egasi (migratsiya huquqi); ilova o'zi `APP_DB_LOGIN` bilan ulanadi.
 */
async function dbMigrate(): Promise<void> {
  const url = requireDatabaseUrl();
  const login = process.env['APP_DB_LOGIN'];
  const password = process.env['APP_DB_PASSWORD'];
  if (!login || !password) throw new Error('APP_DB_LOGIN va APP_DB_PASSWORD majburiy');
  await runMigrations(url);
  await seed(url, { withTestDirector: false });
  const db = createDb(url, { max: 1, appName: 'lg-migrate' });
  try {
    await ensureAppLogin(db, login, password);
  } finally {
    await closeDb(db);
  }
  console.info(`Migratsiya tayyor; lg_app → ${login}`);
}

const MESSAGES: Record<FirstDirectorError['code'], string> = {
  DIRECTOR_EXISTS: 'Faol Direktor allaqachon bor. Yangi xodim — web panelda (Xodimlar).',
  PHONE_TAKEN: 'Bu telefon raqam bilan foydalanuvchi bor.',
  INVALID_INPUT: "Telefon E.164 formatida (+998...) va ism kamida 2 belgi bo'lishi kerak.",
  NOT_SEEDED: "Rollar yo'q — avval: pnpm --filter @lg/db db:migrate && db:seed",
};

async function directorCreate(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { phone: { type: 'string' }, name: { type: 'string' } },
  });
  if (!values.phone || !values.name) throw new Error(HELP);
  const db = createDb(requireDatabaseUrl(), { max: 1, appName: 'lg-cli' });
  try {
    const { token, expiresAt } = await createFirstDirector(
      db,
      { phone: values.phone, fullName: values.name },
      new SystemClock().now(),
    );
    // Yashirin standart yo'q (CLAUDE.md): manzil berilmasa — havola yaroqsiz, shuning uchun xato.
    const base = process.env['PUBLIC_APP_URL'];
    if (!base) throw new Error("PUBLIC_APP_URL yo'q — taklif havolasini yasab bo'lmaydi");
    console.info(
      `Direktor yaratildi. Sozlash havolasi (${expiresAt.toISOString()} gacha, bir marta):`,
    );
    console.info(`${base}/invite/${token}`);
  } finally {
    await closeDb(db);
  }
}

async function main(): Promise<void> {
  loadRootEnv();
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'director:create') return directorCreate(rest);
  if (command === 'db:migrate') return dbMigrate();
  throw new Error(HELP);
}

main().catch((err: unknown) => {
  console.error(
    err instanceof FirstDirectorError
      ? MESSAGES[err.code]
      : err instanceof Error
        ? err.message
        : err,
  );
  process.exitCode = 1;
});
