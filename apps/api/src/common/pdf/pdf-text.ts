/** Standart PDF shrifti (WinAnsi) faqat lotin: o'zbek harflari soddalashadi, kirill — translit. */
const CYRILLIC: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 's',
  ч: 'ch',
  ш: 'sh',
  щ: 'sh',
  ъ: "'",
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: "o'",
  қ: 'q',
  ғ: "g'",
  ҳ: 'h',
};

const cyrillic = (ch: string): string => {
  const low = CYRILLIC[ch.toLowerCase()];
  if (low === undefined) return ch;
  return ch === ch.toLowerCase() ? low : low.charAt(0).toUpperCase() + low.slice(1);
};

/**
 * PDF'ga yoziladigan matn. Shriftda yo'q belgi `pdf-lib`da xato beradi (chek/hisobot ochilmay
 * qolardi) — shuning uchun qolgan noma'lum belgi `?` bo'ladi.
 */
export const pdfText = (text: string): string =>
  text
    .replace(/№/g, 'No.')
    .replace(/[\u02BB\u02BC\u2018\u2019]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[\u2212\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u202F]/g, ' ')
    .replace(/[\u0400-\u04FF]/g, cyrillic)
    .replace(/[^\x20-\x7E\u00A1-\u00FF]/g, '?');
