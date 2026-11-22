import { describe, expect, it } from 'vitest';
import { deepLinkPath, parseStartParam, SCREEN_PATHS } from './deep-link.js';
import { createAppRouter } from './router.js';

/** Router marshruti (`/lesson/$id`) → regex; parametr — bitta segment. */
const toRegex = (template: string) =>
  new RegExp(`^${template.replace(/\$[A-Za-z]+/g, '[^/]+').replace(/\/$/, '')}/?$`);

describe('SCREEN_PATHS — har deep link mavjud marshrutga olib boradi', () => {
  const routes = Object.keys(createAppRouter().routesByPath).map(toRegex);
  const cases = Object.entries(SCREEN_PATHS).flatMap(([screen, path]) => [
    [screen, path()] as const,
    [screen, path('01a2b3c4-0000-7000-8000-000000000001')] as const,
  ]);

  it.each(cases)('%s → %s', (_screen, path) => {
    expect(routes.some((r) => r.test(path))).toBe(true);
  });
});

/** screens.md §5: prefiks → ekran → yo'l (qurilmagan ekran — bosh sahifa). */
describe("deep link prefikslari to'g'ri ekranga olib boradi", () => {
  const ID = '01a2b3c4-0000-7000-8000-000000000001';
  it.each([
    [`att_${ID}`, `/lesson/${ID}`],
    [`les_${ID}`, '/'],
    [`res_${ID}`, '/results'],
    [`tst_${ID}`, '/results'],
    [`rep_${ID}`, '/results'],
    [`bil_${ID}`, '/payments'],
    [`pay_${ID}`, '/pay'],
    [`sub_${ID}`, `/submission/${ID}`],
    [`tik_${ID}`, '/tickets'],
    [`imp_${ID}`, '/'],
    ['pay_q', '/staff/queue'],
    [`apr_${ID}`, `/staff/approvals/${ID}`],
    [`stu_${ID}`, `/staff/student/${ID}`],
  ])('%s → %s', (param, path) => {
    const link = parseStartParam(param);
    expect(link && deepLinkPath(link)).toBe(path);
  });
});
