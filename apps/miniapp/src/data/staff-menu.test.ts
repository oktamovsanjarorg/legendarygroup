import { ROLE_PERMISSIONS } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import { tabsFor } from '../tabs.js';
import { STAFF_MENU, staffMenuFor } from './staff-menu.js';

const tabPaths = (role: 'admin' | 'director') => tabsFor(role).map((t) => t.to);
const keys = (groups: ReturnType<typeof staffMenuFor>) =>
  groups.flatMap((g) => g.items.map((i) => i.key));

describe('MS-06 Koʻproq (T-130)', () => {
  it('Admin: toʻlov kiritish bor; navbat tabda — takrorlanmaydi; soʻrovlar — ruxsat yoʻq', () => {
    expect(keys(staffMenuFor(ROLE_PERMISSIONS.admin, tabPaths('admin')))).toEqual([
      'newStudent',
      'leads',
      'linkRequests',
      'pay',
      'debtors',
      'payments',
      'discounts',
      'cash',
      'groups',
      'calendar',
      'attendance',
      'courses',
      'rooms',
      'holidays',
      'tickets',
      'announcements',
      'undelivered',
      'reports',
      'forecasts',
    ]);
  });

  it('Director: navbat Koʻproq’da (tabda yoʻq), soʻrovlar — tabda', () => {
    expect(keys(staffMenuFor(ROLE_PERMISSIONS.director, tabPaths('director')))).toEqual([
      'newStudent',
      'leads',
      'linkRequests',
      'pay',
      'debtors',
      'payments',
      'discounts',
      'queue',
      'cash',
      'addExpense',
      'groups',
      'calendar',
      'attendance',
      'courses',
      'rooms',
      'holidays',
      'tickets',
      'announcements',
      'undelivered',
      'finance',
      'payroll',
      'reports',
      'forecasts',
      'people',
      'settings',
      'audit',
    ]);
  });

  it('ruxsatsiz band koʻrsatilmaydi, boʻsh boʻlim tushib qoladi', () => {
    expect(staffMenuFor([], [])).toEqual([]);
  });

  it('har band yoʻli xodim marshruti, kalitlar takrorlanmaydi', () => {
    expect(STAFF_MENU.every((i) => i.to.startsWith('/staff/'))).toBe(true);
    expect(new Set(STAFF_MENU.map((i) => i.key)).size).toBe(STAFF_MENU.length);
  });

  it('xodim tablari: 4 ta, oxirgisi — Koʻproq', () => {
    for (const role of ['admin', 'director'] as const) {
      expect(tabsFor(role)).toHaveLength(4);
      expect(tabsFor(role).at(-1)?.to).toBe('/staff/more');
    }
  });
});
