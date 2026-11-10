import { describe, expect, it } from 'vitest';
import { PERMISSIONS } from './permissions.js';

describe('PERMISSIONS', () => {
  it('should have unique permission codes', () => {
    const unique = new Set(PERMISSIONS);
    expect(unique.size).toBe(PERMISSIONS.length);
  });

  it('should contain fundamental permission codes', () => {
    expect(PERMISSIONS).toContain('staff.manage');
    expect(PERMISSIONS).toContain('attendance.mark');
    expect(PERMISSIONS).toContain('payment.create');
    expect(PERMISSIONS).toContain('payroll.manage');
  });
});
