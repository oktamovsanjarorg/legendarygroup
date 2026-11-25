import { describe, expect, it } from 'vitest';
import { randomToken, sha256 } from './crypto.js';

describe('Tokenlar', () => {
  it('randomToken — 256 bit, URL-xavfsiz; sha256 — hex', () => {
    const t = randomToken();
    expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(sha256('a')).toMatch(/^[0-9a-f]{64}$/);
  });
});
