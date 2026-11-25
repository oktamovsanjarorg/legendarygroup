import { describe, expect, it } from 'vitest';
import { pdfText } from './pdf-text.js';

describe('pdfText', () => {
  it('oʻzbek belgilari, minus va boʻshliq', () => {
    expect(pdfText('Toʻlov − 1 000 soʻm №5')).toBe("To'lov - 1 000 so'm No.5");
  });
  it('kirill ism — translit, boshqa belgi — ? (xato emas)', () => {
    expect(pdfText('Шоира Қодирова')).toBe('Shoira Qodirova');
    expect(pdfText('Ali 😀')).toMatch(/^Ali \?+$/);
  });
});
