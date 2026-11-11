import { describe, expect, it } from 'vitest';
import { messages } from './index.js';

/**
 * CLAUDE.md: foydalanuvchi matnlarida faqat rasmiy imlo — oʻ/gʻ uchun U+02BB (ʻ),
 * tutuq belgisi uchun U+02BC (ʼ). ASCII ' va tipografik ‘ ’ ` taqiqlangan.
 */
const FORBIDDEN = /['‘’`]/u;

function* leaves(node: unknown, path: string): Generator<[string, string]> {
  if (typeof node === 'string') {
    yield [path, node];
    return;
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) yield* leaves(value, `${path}.${key}`);
  }
}

describe("i18n imlo (CLAUDE.md 'Matnlar')", () => {
  const all = [...leaves(messages, 'messages')];

  it('kamida bitta matn bor', () => {
    expect(all.length).toBeGreaterThan(0);
  });

  it.each(all)("%s — noto'g'ri apostrof yo'q", (_path, text) => {
    expect(text).not.toMatch(FORBIDDEN);
  });
});
