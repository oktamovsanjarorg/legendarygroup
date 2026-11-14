import { describe, expect, it } from 'vitest';
import {
  calculatePercentage,
  matchStudent,
  type StudentCandidate,
  validateSectionScores,
  validateTestScore,
} from './test.policy.js';

describe('BR-34: Test bali tekshiruvi (validateTestScore & validateSectionScores)', () => {
  it('toʻgʻri ball 0 dan max_score oraligʻida qabul qilinadi', () => {
    expect(validateTestScore(0, 100)).toBe(true);
    expect(validateTestScore(50, 100)).toBe(true);
    expect(validateTestScore(100, 100)).toBe(true);
  });

  it('manfiy ball yoki max_score dan katta ball rad etiladi', () => {
    expect(validateTestScore(-1, 100)).toBe(false);
    expect(validateTestScore(101, 100)).toBe(false);
    expect(validateTestScore(50, 0)).toBe(false);
  });

  it('boʻlim ballari oʻz boʻlimining max_score idan oshmasligi kerak', () => {
    const sections = [
      { name: 'Listening', maxScore: 30 },
      { name: 'Reading', maxScore: 40 },
    ];

    const validScores = [
      { sectionName: 'Listening', score: 25 },
      { sectionName: 'Reading', score: 38 },
    ];
    expect(validateSectionScores(validScores, sections).valid).toBe(true);

    const invalidScores = [{ sectionName: 'Listening', score: 35 }];
    expect(validateSectionScores(invalidScores, sections).valid).toBe(false);

    const unknownSection = [{ sectionName: 'Speaking', score: 10 }];
    expect(validateSectionScores(unknownSection, sections).valid).toBe(false);
  });

  it('calculatePercentage foizni 2 xonali aniqlikda hisoblaydi', () => {
    expect(calculatePercentage(85, 100)).toBe(85);
    expect(calculatePercentage(25, 30)).toBe(83.33);
    expect(calculatePercentage(0, 100)).toBe(0);
    expect(calculatePercentage(50, 0)).toBe(0);
  });
});

describe('BR-35: Excel importida oʻquvchini moslashtirish (matchStudent)', () => {
  const students: StudentCandidate[] = [
    {
      id: '0190a000-0000-7000-8000-000000000001',
      code: 10001,
      fullName: 'Aliyev Valijon Olimovich',
    },
    {
      id: '0190a000-0000-7000-8000-000000000002',
      code: 10002,
      fullName: 'Karimov Jasur Bahodirovich',
    },
    { id: '0190a000-0000-7000-8000-000000000003', code: 10003, fullName: "Yo'ldoshev Azizbek" },
  ];

  it('1-bosqich: oʻquvchi kodi (code) boʻyicha aniq moslik', () => {
    const res = matchStudent('10002', students);
    expect(res.type).toBe('code');
    if (res.type === 'code') {
      expect(res.student.fullName).toBe('Karimov Jasur Bahodirovich');
    }
  });

  it('2-bosqich: toʻliq ism boʻyicha aniq moslik (harf registr va probellardan qatʼi nazar)', () => {
    const res = matchStudent('  aliyev valijon olimovich ', students);
    expect(res.type).toBe('exact_name');
    if (res.type === 'exact_name') {
      expect(res.student.code).toBe(10001);
    }
  });

  it('3-bosqich: fuzzy moslik oʻxshash ismni taklif qiladi', () => {
    // Kichik imlo xatosi: "Yoldashev Azizbek" vs "Yo'ldoshev Azizbek"
    const res = matchStudent('Yoldashev Azizbek', students);
    expect(res.type).toBe('suggested');
    if (res.type === 'suggested') {
      expect(res.student.code).toBe(10003);
      expect(res.similarity).toBeGreaterThan(0.7);
    }
  });

  it('topilmagan yoki butunlay boshqa ism unmatched deb qaytariladi', () => {
    const res = matchStudent('Begona Shaxs Nomaʼlum', students);
    expect(res.type).toBe('unmatched');
  });

  it('boʻsh qator unmatched deb qaytariladi', () => {
    const res = matchStudent('   ', students);
    expect(res.type).toBe('unmatched');
  });
});
