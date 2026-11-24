/**
 * Web panel Telegram ichida ochilsa (BotFather "Main Mini App" yoki havola saytning ildiziga
 * qaraganda) — Mini App'ga yo'naltiramiz. Telegram launch parametrlarini URL hash'ida beradi
 * (`#tgWebAppData=...`); ular saqlanadi, aks holda Mini App foydalanuvchini taniy olmaydi.
 * Web panel login'i xodimlar uchun brauzerda — Telegram ichida kerak emas.
 */
export const MINIAPP_PATH = '/app/';

export function miniAppRedirect(loc: {
  pathname: string;
  search: string;
  hash: string;
}): string | null {
  if (loc.pathname.startsWith(MINIAPP_PATH)) return null;
  const params = new URLSearchParams(loc.hash.replace(/^#/, ''));
  if (!params.has('tgWebAppData')) return null;
  return `${MINIAPP_PATH}${loc.search}${loc.hash}`;
}
