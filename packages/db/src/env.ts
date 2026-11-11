import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT_ENV = fileURLToPath(new URL('../../../.env', import.meta.url));

/** Monorepo ildizidagi `.env`ni yuklaydi (faqat CLI skriptlar uchun; mavjud o'zgaruvchilar ustidan yozilmaydi). */
export function loadRootEnv(): void {
  if (existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV);
}

/** `DATABASE_URL` majburiy — yashirin standart qiymat yo'q (noto'g'ri bazaga ulanib ketmaslik uchun). */
export function requireDatabaseUrl(): string {
  const url = process.env['DATABASE_URL'];
  if (!url) throw new Error("DATABASE_URL o'rnatilmagan (.env.example ga qarang)");
  return url;
}

/** Log uchun parolni yashiradi. */
export const maskUrl = (url: string): string => url.replace(/\/\/([^:/@]+):[^@]*@/, '//$1:****@');

/** Fayl `tsx src/x.ts` orqali to'g'ridan-to'g'ri ishga tushirilganmi. */
export const isMain = (metaUrl: string): boolean =>
  process.argv[1] !== undefined && metaUrl === pathToFileURL(process.argv[1]).href;
