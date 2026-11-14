import { toYmd } from '@lg/i18n';

/** Bugungi kalendar kuni (Asia/Tashkent) — forma standart qiymatlari uchun; hisob-kitob serverda. */
export const todayYmd = (): string => toYmd(new Date());
