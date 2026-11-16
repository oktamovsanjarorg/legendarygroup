import { Home } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { NAV, visibleNav } from './nav.js';

describe('Menyu ruxsatga qarab (11-ux §2)', () => {
  const items = [
    { screen: 'W-04', to: '/', label: 'Bosh', icon: Home },
    { screen: 'W-30', to: '/audit', label: 'Audit', icon: Home, permission: 'audit.view' as const },
  ];
  it("ruxsatsiz bo'lim ko'rinmaydi", () => {
    expect(visibleNav(new Set(['course.manage']), items).map((i) => i.screen)).toEqual(['W-04']);
    expect(visibleNav(new Set(['audit.view']), items).map((i) => i.screen)).toEqual([
      'W-04',
      'W-30',
    ]);
  });

  it('W-36 «Yordam» menyuda sessions oldidan joylashgan va hammaga koʻrinadi', () => {
    const helpIdx = NAV.findIndex((i) => i.screen === 'W-36');
    const sessionsIdx = NAV.findIndex((i) => i.screen === 'W-32');
    expect(helpIdx).toBeGreaterThan(-1);
    expect(sessionsIdx).toBe(helpIdx + 1);

    const helpItem = NAV[helpIdx];
    expect(helpItem?.to).toBe('/help');
    expect(helpItem?.permission).toBeUndefined();

    // Ruxsat bo'lmaganda ham ko'rinadi
    const visible = visibleNav(new Set());
    expect(visible.some((i) => i.screen === 'W-36')).toBe(true);
  });
});
