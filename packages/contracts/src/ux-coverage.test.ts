import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from './permissions.js';

const read = (rel: string) =>
  readFileSync(fileURLToPath(new URL(`../../../docs/${rel}`, import.meta.url)), 'utf8');
const FR = /FR-[A-Z]+-\d+/g;

/** T-017a AC: "bog'lanmagan FR qolmasligi kerak" — CI'da. */
describe('UX ekranlar xaritasi (docs/ux/screens.md)', () => {
  const screens = read('ux/screens.md');
  const coverage = screens.slice(screens.indexOf('## 3. FR qamrovi'), screens.indexOf('## 4.'));
  const screenIds = new Set(
    [...screens.matchAll(/^\| ((?:MT|MG|MS|C|W|B)-\d{2}) /gm)].map((m) => m[1]),
  );

  it('01-requirements dagi har FR qamrov jadvalida bor', () => {
    const required = [...new Set(read('01-requirements.md').match(FR))].sort();
    const covered = new Set(coverage.match(FR));
    expect(required.filter((fr) => !covered.has(fr))).toEqual([]);
  });

  it("qamrov jadvalidagi har ekran ID'si ta'riflangan", () => {
    const referenced = [...new Set(coverage.match(/\b(?:MT|MG|MS|C|W|B)-\d{2}\b/g))];
    expect(referenced.filter((id) => !screenIds.has(id))).toEqual([]);
  });

  it('ekranlardagi ruxsat kodlari katalogda bor', () => {
    const codes = new Set(screens.match(/\b[a-z]+\.[a-z_]+\b/g)?.filter((c) => c.includes('.')));
    const known = new Set<string>(PERMISSIONS);
    const unknown = [...codes].filter(
      (c) =>
        /^(staff|settings|audit|course|group|lesson|student|lead|attendance|absence|grade|test|results|payment|discount|penalty|billing|cash|expense|finance|payroll|announcement|ticket|stats|approval)\./.test(
          c,
        ) && !known.has(c),
    );
    expect(unknown).toEqual([]);
  });
});
