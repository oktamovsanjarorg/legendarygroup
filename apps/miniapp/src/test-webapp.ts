import { createFakeWebApp, type FakeWebApp } from '@lg/ui-tg/testing';

type Opts = Parameters<typeof createFakeWebApp>[0];

/**
 * Butun ilova testlari uchun fake WebApp: C-06 tanishtiruvi (T-125) allaqachon ko'rilgan —
 * aks holda har test avval 3 kartochkadan o'tishi kerak bo'lardi. Tanishtiruvning o'zi —
 * `screens/common/intro.test.tsx` va e2e `miniapp/intro.spec.ts`.
 */
export function appWebApp(opts?: Opts): FakeWebApp {
  const wa = createFakeWebApp(opts);
  for (const kind of ['teacher', 'guardian', 'staff']) wa.storage.set(`lg_intro_${kind}`, '1');
  return wa;
}
