import { describe, expect, it } from 'vitest';
import { isUniqueViolation } from './errors.js';

describe('isUniqueViolation', () => {
  const pg = { code: '23505', constraint_name: 'courses_branch_name_active_uq' };
  it('drizzle oʻrami (cause) ichidan topadi', () => {
    const wrapped = Object.assign(new Error('query failed'), { cause: pg });
    expect(isUniqueViolation(wrapped)).toBe(true);
    expect(isUniqueViolation(wrapped, 'courses_branch_name_active_uq')).toBe(true);
    expect(isUniqueViolation(wrapped, 'rooms_branch_name_active_uq')).toBe(false);
  });
  it('boshqa xatolar — false', () => {
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
    expect(isUniqueViolation(new Error('x'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation({ code: 'ECONNREFUSED' })).toBe(false);
  });
});
