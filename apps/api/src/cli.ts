import { parseArgs } from 'node:util';
import { closeDb, createDb, loadRootEnv, requireDatabaseUrl, runMigrations, seed } from '@lg/db';
import { SystemClock } from '@lg/domain';
import { ensureAppLogin } from './db-login.js';
import { DirectorTransferError, transferDirector } from './modules/rbac/director-transfer.js';
import {
  createFirstDirector,
  FirstDirectorError,
  relinkDirector,
} from './modules/rbac/first-director.js';

/**
 * Ma'muriy CLI (`pnpm cli <buyruq>`).
 *   director:create --phone +998901234567 --name "Ism Familiya"
 * Parol yo'q (Q-98): Director botda shu raqamni ulashib kiradi.
 */
const HELP = `Foydalanish:
  pnpm cli director:create --phone +998901234567 --name "Ism Familiya"
  pnpm cli director:relink --current +998901234567 --phone +998907654321  (Telegram/raqam yo'qolgan)
  pnpm cli director:transfer --phone +998901234567 --name "Ism Familiya"  (joriy Director → Admin)
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
  NO_DIRECTOR: "Bu raqam (--current) bilan faol Direktor yo'q.",
};

/** Keyingi qadam: bot havolasi (yashirin standart yo'q — CLAUDE.md). */
function botUrl(): string {
  const username = process.env['TELEGRAM_BOT_USERNAME'];
  if (!username) throw new Error("TELEGRAM_BOT_USERNAME yo'q — bot havolasini yasab bo'lmaydi");
  return `https://t.me/${username}`;
}

const nextStep = (url: string) =>
  console.info(`Keyingi qadam: ${url} → «Start» → «Telefon raqamni ulashish».`);

async function directorCreate(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { phone: { type: 'string' }, name: { type: 'string' } },
  });
  if (!values.phone || !values.name) throw new Error(HELP);
  const url = botUrl();
  const db = createDb(requireDatabaseUrl(), { max: 1, appName: 'lg-cli' });
  try {
    const input = { phone: values.phone, fullName: values.name };
    await createFirstDirector(db, input, new SystemClock().now());
    console.info('Direktor yaratildi.');
    nextStep(url);
  } finally {
    await closeDb(db);
  }
}

/** `director:relink`: raqamni almashtirish va eski Telegram'ni uzish (favqulodda kirish). */
async function directorRelink(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { current: { type: 'string' }, phone: { type: 'string' } },
  });
  if (!values.current || !values.phone) throw new Error(HELP);
  const url = botUrl();
  const db = createDb(requireDatabaseUrl(), { max: 1, appName: 'lg-cli' });
  try {
    const input = { current: values.current, phone: values.phone };
    await relinkDirector(db, input, new SystemClock().now());
    console.info('Direktor raqami yangilandi, eski Telegram uzildi, sessiyalar yopildi.');
    nextStep(url);
  } finally {
    await closeDb(db);
  }
}

const TRANSFER_MESSAGES: Record<DirectorTransferError['code'], string> = {
  INVALID_INPUT: MESSAGES.INVALID_INPUT,
  NOT_SEEDED: MESSAGES.NOT_SEEDED,
  NO_DIRECTOR: "Direktor yo'q — avval: director:create",
  SAME_PERSON: 'Bu raqam — joriy Direktorniki.',
};

/** `director:transfer`: yangi Director, joriy Director — Admin bo'lib qoladi. */
async function directorTransfer(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { phone: { type: 'string' }, name: { type: 'string' } },
  });
  if (!values.phone || !values.name) throw new Error(HELP);
  const url = botUrl();
  const db = createDb(requireDatabaseUrl(), { max: 1, appName: 'lg-cli' });
  try {
    const r = await transferDirector(
      db,
      { phone: values.phone, fullName: values.name },
      new SystemClock().now(),
    );
    console.info("Direktorlik o'tkazildi; avvalgi Direktor — Admin.");
    if (!r.telegramLinked) nextStep(url);
  } finally {
    await closeDb(db);
  }
}

async function main(): Promise<void> {
  loadRootEnv();
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'director:create') return directorCreate(rest);
  if (command === 'director:relink') return directorRelink(rest);
  if (command === 'director:transfer') return directorTransfer(rest);
  if (command === 'db:migrate') return dbMigrate();
  throw new Error(HELP);
}

main().catch((err: unknown) => {
  console.error(
    err instanceof FirstDirectorError
      ? MESSAGES[err.code]
      : err instanceof DirectorTransferError
        ? TRANSFER_MESSAGES[err.code]
        : err instanceof Error
          ? err.message
          : err,
  );
  process.exitCode = 1;
});
