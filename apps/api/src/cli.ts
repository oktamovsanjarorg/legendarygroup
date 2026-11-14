import { parseArgs } from 'node:util';
import { closeDb, createDb, loadRootEnv, requireDatabaseUrl, runMigrations, seed } from '@lg/db';
import { SystemClock } from '@lg/domain';
import { ensureAppLogin } from './db-login.js';
import { DirectorTransferError, transferDirector } from './modules/rbac/director-transfer.js';
import {
  createFirstDirector,
  FirstDirectorError,
  reissueDirectorInvite,
} from './modules/rbac/first-director.js';

/**
 * Ma'muriy CLI (`pnpm cli <buyruq>`).
 *   director:create --phone +998901234567 --name "Ism Familiya"
 * Taklif havolasini chiqaradi (24 soat): `<PUBLIC_APP_URL>/invite/<token>`.
 */
const HELP = `Foydalanish:
  pnpm cli director:create --phone +998901234567 --name "Ism Familiya"
  pnpm cli director:reinvite --phone +998901234567 --name "Ism Familiya"  (faollashmagan Director)
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
  NO_PENDING_DIRECTOR: "Faollashmagan Direktor yo'q (parol o'rnatilgan). Boshqaruv — web panelda.",
};

type DirectorAction = typeof createFirstDirector;

/** `director:create` va `director:reinvite` — bir xil kiritma, natija: bir martalik havola. */
async function directorInvite(args: string[], action: DirectorAction, done: string): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { phone: { type: 'string' }, name: { type: 'string' } },
  });
  if (!values.phone || !values.name) throw new Error(HELP);
  // Yashirin standart yo'q (CLAUDE.md): manzil berilmasa — havola yaroqsiz, shuning uchun xato.
  const base = process.env['PUBLIC_APP_URL'];
  if (!base) throw new Error("PUBLIC_APP_URL yo'q — taklif havolasini yasab bo'lmaydi");
  const db = createDb(requireDatabaseUrl(), { max: 1, appName: 'lg-cli' });
  try {
    const { token, expiresAt } = await action(
      db,
      { phone: values.phone, fullName: values.name },
      new SystemClock().now(),
    );
    console.info(`${done}. Sozlash havolasi (${expiresAt.toISOString()} gacha, bir marta):`);
    console.info(`${base}/invite/${token}`);
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

/** `director:transfer`: yangi Director (taklif bilan), joriy Director — Admin bo'lib qoladi. */
async function directorTransfer(args: string[]): Promise<void> {
  const { values } = parseArgs({
    args,
    options: { phone: { type: 'string' }, name: { type: 'string' } },
  });
  if (!values.phone || !values.name) throw new Error(HELP);
  const appUrl = process.env['PUBLIC_APP_URL'];
  const botUsername = process.env['TELEGRAM_BOT_USERNAME'];
  if (!appUrl || !botUsername) throw new Error('PUBLIC_APP_URL va TELEGRAM_BOT_USERNAME majburiy');
  const db = createDb(requireDatabaseUrl(), { max: 1, appName: 'lg-cli' });
  try {
    const r = await transferDirector(
      db,
      { appUrl, botUsername },
      { phone: values.phone, fullName: values.name },
      new SystemClock().now(),
    );
    console.info("Direktorlik o'tkazildi; avvalgi Direktor — Admin.");
    if (r.invite)
      console.info(`Sozlash havolasi (${r.invite.expiresAt} gacha, bir marta):\n${r.invite.url}`);
    else console.info("Yangi Direktor allaqachon parol o'rnatgan — web panelga kiradi.");
  } finally {
    await closeDb(db);
  }
}

async function main(): Promise<void> {
  loadRootEnv();
  const [command, ...rest] = process.argv.slice(2);
  if (command === 'director:create')
    return directorInvite(rest, createFirstDirector, 'Direktor yaratildi');
  if (command === 'director:reinvite')
    return directorInvite(rest, reissueDirectorInvite, 'Direktor taklifi yangilandi');
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
