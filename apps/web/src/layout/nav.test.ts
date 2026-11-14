import { Home } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { visibleNav } from './nav.js';

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
});
