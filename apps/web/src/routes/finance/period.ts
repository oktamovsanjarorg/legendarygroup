/** Hisob davri `YYYY-MM` yordamchilari (faqat ko'rinish/so'rov parametrlari uchun). */
export const prevPeriod = (p: string): string => {
  const [y, m] = p.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

/** Oyning birinchi va oxirgi kuni (`2026-02` → `2026-02-01`..`2026-02-28`). */
export const monthBounds = (p: string): { from: string; to: string } => {
  const [y, m] = p.split('-').map(Number) as [number, number];
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return { from: `${p}-01`, to: `${p}-${String(last).padStart(2, '0')}` };
};
