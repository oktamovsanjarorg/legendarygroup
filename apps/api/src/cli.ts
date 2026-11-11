import { parseArgs } from 'node:util';
import { closeDb, createDb, loadRootEnv, requireDatabaseUrl } from '@lg/db';
import { SystemClock } from '@lg/domain';
import { createFirstDirector, FirstDirectorError } from './modules/rbac/first-director.js';

/**
 * Ma'muriy CLI (`pnpm cli <buyruq>`).
 *   director:create --phone +998901234567 --name "Ism Familiya"
 * Taklif havolasini chiqaradi (24 soat): `<PUBLIC_APP_URL>/invite/<token>`.
 */
const HELP = `Foydalanish:
  pnpm cli director:create --phone +998901234567 --name "Ism Familiya"`;

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
    const base = process.env['PUBLIC_APP_URL'] ?? '';
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
