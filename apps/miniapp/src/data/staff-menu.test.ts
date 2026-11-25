import { ROLE_PERMISSIONS } from '@lg/contracts';
import { describe, expect, it } from 'vitest';
import { tabsFor } from '../tabs.js';
import { STAFF_MENU, staffMenuFor } from './staff-menu.js';

const tabPaths = (role: 'admin' | 'director') =>
  tabsFor(role, ROLE_PERMISSIONS[role]).map((t) => t.to);
const keys = (groups: ReturnType<typeof staffMenuFor>) =>
  groups.flatMap((g) => g.items.map((i) => i.key));

describe('MS-06 Koʻproq (T-130)', () => {
  it('Admin: toʻlov tabda — takrorlanmaydi; navbat menyuda; soʻrovlar — ruxsat yoʻq (Q-113)', () => {
    expect(keys(staffMenuFor(ROLE_PERMISSIONS.admin, tabPaths('admin')))).toEqual([
      'newStudent',
      'leads',
      'linkRequests',
      'debtors',
      'payments',
      'discounts',
      'queue',
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
      'help',
      'sessions',
    ]);
  });

  it('Director: navbat va soʻrovlar menyuda; moliya — tabda (Q-113)', () => {
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
      'approvals',
      'payroll',
      'reports',
      'forecasts',
      'people',
      'settings',
      'audit',
      'help',
      'sessions',
    ]);
  });

  it('ruxsatsiz — faqat yordam va sessiyalar; boʻsh boʻlim tushib qoladi', () => {
    expect(keys(staffMenuFor([], []))).toEqual(['help', 'sessions']);
  });

  it('har band yoʻli xodim marshruti, kalitlar takrorlanmaydi', () => {
    expect(STAFF_MENU.every((i) => i.to.startsWith('/staff/'))).toBe(true);
    expect(new Set(STAFF_MENU.map((i) => i.key)).size).toBe(STAFF_MENU.length);
  });

  it('xodim tablari: Bugun, Oʻquvchilar, …, Yordamchi, Menyu (Q-113, Q-114)', () => {
    expect(tabPaths('admin')).toEqual([
      '/',
      '/staff/search',
      '/staff/pay',
      '/staff/assistant',
      '/staff/more',
    ]);
    expect(tabPaths('director')).toEqual([
      '/',
      '/staff/search',
      '/staff/finance',
      '/staff/assistant',
      '/staff/more',
    ]);
  });

  it('ruxsati yoʻq tab koʻrsatilmaydi', () => {
    expect(tabsFor('admin', []).map((t) => t.to)).toEqual(['/', '/staff/search', '/staff/more']);
  });
});
