import { describe, expect, it } from 'vitest';
import { MAX_TEST_SCORE, parseNewTest } from './test-create.js';

describe('parseNewTest (MT-07a, CreateTestRequest)', () => {
  it('nomni qirqadi va maks. ballni son qiladi', () => {
    expect(parseNewTest('  Unit 5 ', '2026-11-16', '40')).toEqual({
      title: 'Unit 5',
      date: '2026-11-16',
      maxScore: 40,
    });
  });

  it.each([
    ['', '2026-11-16', '40'],
    ['   ', '2026-11-16', '40'],
    ['x'.repeat(121), '2026-11-16', '40'],
    ['Test', '2026-11-16', '0'],
    ['Test', '2026-11-16', ''],
    ['Test', '2026-11-16', String(MAX_TEST_SCORE + 1)],
    ['Test', '', '40'],
  ])('notoʻgʻri kiritish → null (%s, %s, %s)', (title, date, max) => {
    expect(parseNewTest(title, date, max)).toBeNull();
  });
});
