import { describe, expect, it } from 'vitest';
import { changedFields, maskPii } from './audit-diff.js';

describe('changedFields — audit uchun faqat farq', () => {
  it('oʻzgarmagan va roʻyxatda yoʻq maydonlar tushmaydi; massiv qiymat boʻyicha', () => {
    const before = { name: 'A', levels: ['B1'], price: '1', updatedAt: 'x' };
    const after = { name: 'A', levels: ['B1', 'B2'], price: '2', updatedAt: 'y' };
    expect(changedFields(before, after, ['name', 'levels', 'price'])).toEqual({
      before: { levels: ['B1'], price: '1' },
      after: { levels: ['B1', 'B2'], price: '2' },
    });
  });
});

describe("PII audit'da maskalanadi", () => {
  it('telefon — +99890***4567', () => {
    expect(
      changedFields({ phone: '+998901234567' }, { phone: '+998931112233' }, ['phone']),
    ).toEqual({ before: { phone: '+99890***4567' }, after: { phone: '+99893***2233' } });
    expect(maskPii({ phone: '+998901234567', name: 'A' })).toEqual({
      phone: '+99890***4567',
      name: 'A',
    });
  });
});
