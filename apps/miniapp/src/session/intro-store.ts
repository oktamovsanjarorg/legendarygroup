import { supports, type WebApp } from '@lg/ui-tg';
import type { IntroKind } from '../screens/common/intro.js';

export interface IntroStore {
  seen(kind: IntroKind): Promise<boolean>;
  markSeen(kind: IntroKind): Promise<void>;
}

const key = (kind: IntroKind) => `lg_intro_${kind}`;

/**
 * C-06 ko'rilgani (T-125): Telegram CloudStorage — barcha qurilmalarda bir marta.
 * 6.9 dan eski klientda saqlab bo'lmaydi — tanishtiruv ko'rsatilmaydi (har safar chiqmasin).
 */
export function cloudIntroStore(wa: WebApp): IntroStore {
  const cs = supports(wa, 'cloudStorage') ? wa.CloudStorage : null;
  return {
    seen: (kind) =>
      new Promise((resolve) => {
        if (!cs) return resolve(true);
        cs.getItem(key(kind), (err, value) => resolve(Boolean(err) || value === '1'));
      }),
    markSeen: (kind) =>
      new Promise((resolve) => (cs ? cs.setItem(key(kind), '1', () => resolve()) : resolve())),
  };
}
