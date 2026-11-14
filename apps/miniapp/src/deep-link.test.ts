import { describe, expect, it } from 'vitest';
import { DEEP_LINK_RULES, deepLinkPath, parseStartParam, roleForLink } from './deep-link.js';

const UUID = '3f1c2a9e-8b7d-4c6e-9a1b-2d3e4f5a6b7c';

describe('parseStartParam (screens.md §5)', () => {
  it.each([
    [`att_${UUID}`, 'MT-02', ['teacher']],
    [`les_${UUID}`, 'MG-01', ['guardian']],
    [`pay_${UUID}`, 'MG-06', ['guardian']],
    [`apr_${UUID}`, 'MS-03', ['director']],
    [`stu_${UUID}`, 'MS-05', ['admin', 'director']],
  ])('%s → %s', (param, screen, roles) => {
    expect(parseStartParam(param)).toEqual({ screen, roles, id: UUID });
  });

  it('pay_q — aniq kalit (MS-02 navbat), pay_<id> bilan adashmaydi', () => {
    expect(parseStartParam('pay_q')).toEqual({ screen: 'MS-02', roles: ['admin', 'director'] });
    expect(parseStartParam('pay_qx')?.screen).toBe('MG-06');
  });

  it.each([
    undefined,
    '',
    'att_',
    'unknown_1',
    'att_a_b',
    `att_${'a'.repeat(61)}`,
    'att_<script>',
    "att_1'",
  ])("noto'g'ri: %s → null", (param) => {
    expect(parseStartParam(param)).toBeNull();
  });

  it('jadvaldagi har prefiks screens.md §5 dagi 13 qatorni qamraydi', () => {
    expect(DEEP_LINK_RULES).toHaveLength(13);
    expect(new Set(DEEP_LINK_RULES.map((r) => r.key)).size).toBe(13);
  });
});

describe('deepLinkPath', () => {
  it("ekran qurilgan — yo'l, aks holda null", () => {
    const link = { screen: 'MT-02', roles: ['teacher'] as const, id: 'L1' };
    expect(deepLinkPath(link, { 'MT-02': (id) => `/lessons/${id}/attendance` })).toBe(
      '/lessons/L1/attendance',
    );
    expect(deepLinkPath(link, {})).toBeNull();
  });
});

describe('roleForLink (FR-AUTH-5)', () => {
  const att = { screen: 'MT-02', roles: ['teacher'] as const };
  it('faol rol mos — almashtirish shart emas', () => {
    expect(roleForLink(att, ['teacher', 'guardian'], 'teacher')).toBeNull();
  });
  it("boshqa rolda, lekin foydalanuvchida bor — o'sha rol", () => {
    expect(roleForLink(att, ['teacher', 'guardian'], 'guardian')).toBe('teacher');
    expect(roleForLink(att, ['teacher', 'guardian'], undefined)).toBe('teacher');
  });
  it("foydalanuvchida yo'q — null", () => {
    expect(roleForLink(att, ['guardian'], 'guardian')).toBeNull();
    expect(roleForLink(null, ['guardian'], 'guardian')).toBeNull();
  });
});
