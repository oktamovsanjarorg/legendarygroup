import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const intTests = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = join(dir, e.name);
    if (e.isDirectory()) return intTests(p);
    return e.name.endsWith('.int.test.ts') ? [p] : [];
  });

describe('Integratsiya testlari gigiyenasi', () => {
  it('afterAll `t.close()` — `t.app.close()` vaqtinchalik bazani oʻchirmaydi (lg_int_* toʻplanadi)', () => {
    const offenders = intTests(join(import.meta.dirname, '.')).filter((f) =>
      /\b\w+\.app\.close\(\)/.test(readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });
});
