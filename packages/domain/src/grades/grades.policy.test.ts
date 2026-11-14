import { describe, expect, it } from 'vitest';
import { validateGradeKind, validateGradeValue } from './grades.policy.js';

describe('BR-33 validateGradeValue', () => {
  it('0_5 shkalada 0..5 gacha ruxsat etiladi', () => {
    expect(validateGradeValue('0_5', 0)).toBe(true);
    expect(validateGradeValue('0_5', 4)).toBe(true);
    expect(validateGradeValue('0_5', 5)).toBe(true);
    expect(validateGradeValue('0_5', 6)).toBe(false);
    expect(validateGradeValue('0_5', -1)).toBe(false);
  });

  it('0_100 shkalada 0..100 gacha ruxsat etiladi', () => {
    expect(validateGradeValue('0_100', 0)).toBe(true);
    expect(validateGradeValue('0_100', 85)).toBe(true);
    expect(validateGradeValue('0_100', 100)).toBe(true);
    expect(validateGradeValue('0_100', 101)).toBe(false);
  });
});

describe('BR-33 validateGradeKind', () => {
  it('guruhda ruxsat berilgan turlar tekshiriladi', () => {
    const kinds = ['homework', 'activity'];
    expect(validateGradeKind(kinds, 'homework')).toBe(true);
    expect(validateGradeKind(kinds, 'activity')).toBe(true);
    expect(validateGradeKind(kinds, 'exam')).toBe(false);
  });
});
