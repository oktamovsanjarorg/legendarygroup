import { webMessages as t } from '@lg/i18n';
import { Tour, type TourStep } from '@lg/ui-web';
import { createContext, type ReactNode, useCallback, useContext, useState } from 'react';

const STEPS: readonly TourStep[] = t.tour.steps.map((s) => ({
  target: `[data-tour="${s.to}"]`,
  title: s.title,
  body: s.body,
}));

/** Koʻrilgani — shu brauzerda, xodim boʻyicha (server holati yoʻq — T-124 qarori). */
const seenKey = (userId: string) => `lg_tour_v1:${userId}`;

function wasSeen(userId: string): boolean {
  try {
    return localStorage.getItem(seenKey(userId)) === '1';
  } catch {
    return false;
  }
}

function markSeen(userId: string): void {
  try {
    localStorage.setItem(seenKey(userId), '1');
  } catch {
    // Saqlash bloklangan (maxfiy oyna) — keyingi kirishda yana chiqadi.
  }
}

const TourContext = createContext<() => void>(() => undefined);

/** «Yordam» sahifasidagi «Tanishtiruvni qayta koʻrish». */
export const useStartTour = () => useContext(TourContext);

/**
 * T-124: panelga birinchi kirishda menyu boʻylab tanishtiruv (bir marta). Ruxsatsiz menyu bandi
 * DOM'da yoʻq — uning qadami ham yoʻq (Admin'da «Tasdiqlash soʻrovlari» chiqmaydi).
 */
export function AppTour({ userId, children }: { userId: string; children: ReactNode }) {
  const [open, setOpen] = useState(() => !wasSeen(userId));
  const close = useCallback(() => {
    markSeen(userId);
    setOpen(false);
  }, [userId]);
  const start = useCallback(() => setOpen(true), []);
  return (
    <TourContext.Provider value={start}>
      {children}
      {open && <Tour steps={STEPS} onClose={close} />}
    </TourContext.Provider>
  );
}
