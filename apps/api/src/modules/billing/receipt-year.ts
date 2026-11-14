import { formatDateToYmd } from '@lg/domain';

/** Chek raqamlash yili — to'lov lahzasining Toshkent yili (yil boshi 00:00–05:00 UTC'da oldingi yil). */
export function receiptYear(paidAt: Date): number {
  return Number(formatDateToYmd(paidAt).slice(0, 4));
}
