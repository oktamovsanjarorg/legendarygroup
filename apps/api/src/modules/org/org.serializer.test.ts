import { describe, expect, it } from 'vitest';
import { changedFields } from './org.serializer.js';

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
