import { describe, expect, it } from 'vitest';
import { isExclusionViolation, isUniqueViolation } from './errors.js';

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

describe('isExclusionViolation', () => {
  it('23P01 va cheklov nomi', () => {
    const err = { cause: { code: '23P01', constraint_name: 'schedule_occupancy_no_overlap' } };
    expect(isExclusionViolation(err, 'schedule_occupancy_no_overlap')).toBe(true);
    expect(isExclusionViolation(err, 'boshqa')).toBe(false);
    expect(isExclusionViolation({ code: '23505' })).toBe(false);
  });
});
