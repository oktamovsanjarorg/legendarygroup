/**
 * Lid holatlari (FR-STU-4, T-107): yangi → qo'ng'iroq qilindi → sinovga keldi → yozildi / rad etdi.
 * `won` — faqat o'quvchiga aylantirish orqali (ma'lumot ko'chadi), qo'lda qo'yilmaydi.
 * Rad etilgan lid qayta ochilishi mumkin (`new`).
 */
export const LEAD_STATUS_FLOW = {
  new: ['contacted', 'trial', 'lost'],
  contacted: ['trial', 'lost'],
  trial: ['contacted', 'lost'],
  lost: ['new'],
  won: [],
} as const satisfies Record<string, readonly string[]>;

export type LeadStatusCode = keyof typeof LEAD_STATUS_FLOW;

export function canChangeLeadStatus(from: LeadStatusCode, to: LeadStatusCode): boolean {
  return (LEAD_STATUS_FLOW[from] as readonly string[]).includes(to);
}

/** Ochiq (ishlanayotgan) lid — telefon bo'yicha takrorlanmaydi. */
export const isOpenLead = (s: LeadStatusCode): boolean =>
  s === 'new' || s === 'contacted' || s === 'trial';

/** O'quvchiga aylantirish mumkin: rad etilmagan va hali aylantirilmagan. */
export const canConvertLead = (s: LeadStatusCode): boolean => isOpenLead(s);

export interface FunnelCounts {
  total: number;
  contacted: number;
  trial: number;
  won: number;
  lost: number;
}

/** Konversiya, foiz (0–100, bir xona): `won / total`. Bo'sh — 0. */
export function conversionPercent(c: Pick<FunnelCounts, 'total' | 'won'>): number {
  if (c.total === 0) return 0;
  return Math.round((c.won * 1000) / c.total) / 10;
}
