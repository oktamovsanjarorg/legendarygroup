/**
 * Qidiruv normalizatsiyasi (CLAUDE.md "Matnlar": har ikki yozuv bir xil): barcha apostrof
 * shakllari (' ‘ ’ ʻ ʼ ` ´) → `'`, kichik harf, ortiqcha bo'shliq yo'q, kirill emas — lotin.
 * DB'da normalizatsiyalangan ustun ustida `pg_trgm` indeks (T-105).
 */
const APOSTROPHES = /['‘’ʻʼ`´]/g;

export function normalizeUz(text: string): string {
  return text.normalize('NFC').replace(APOSTROPHES, "'").toLowerCase().replace(/\s+/g, ' ').trim();
}
