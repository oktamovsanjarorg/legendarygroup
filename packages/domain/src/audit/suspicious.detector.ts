/**
 * Shubhali harakatlarni aniqlash domen qoidalari — FR-AUD-2.
 */

export interface SuspiciousRuleMatch {
  suspicious: boolean;
  riskLevel?: 'high' | 'medium';
  title?: string;
  description?: string;
}

const SUSPICIOUS_ACTION_RULES: Record<
  string,
  { riskLevel: 'high' | 'medium'; title: string; description: string }
> = {
  'payment.reverse': {
    riskLevel: 'high',
    title: 'Toʻlov bekor qilindi (storno)',
    description: 'Kiritilgan toʻlov operatsiyasi bekor qilindi.',
  },
  'payment.refund': {
    riskLevel: 'high',
    title: 'Pul qaytarildi (refund)',
    description: 'Mijozga toʻlov mablagʻi qaytarildi.',
  },
  'discount.grant': {
    riskLevel: 'medium',
    title: 'Chegirma berildi',
    description: 'Oʻquvchiga maxsus chegirma qoʻllandi.',
  },
  'attendance.edit_past': {
    riskLevel: 'medium',
    title: 'Oʻtgan dars davomati tahrirlandi',
    description: 'Oʻtgan dars uchun davomat maʼlumotlari oʻzgartirildi.',
  },
  'penalty.waive': {
    riskLevel: 'medium',
    title: 'Jarima bekor qilindi',
    description: 'Kechikish uchun hisoblangan jarima bekor qilindi.',
  },
};

/**
 * Berilgan amal harakati shubhali qoidalarga tushishini tekshirish.
 */
export function evaluateActionSuspicion(action: string): SuspiciousRuleMatch {
  const rule = SUSPICIOUS_ACTION_RULES[action];
  if (rule) {
    return {
      suspicious: true,
      riskLevel: rule.riskLevel,
      title: rule.title,
      description: rule.description,
    };
  }
  return { suspicious: false };
}

/**
 * Amal Toshkent vaqti (UTC+5) bo'yicha tunda (23:00 - 06:00) bajarilganligini tekshirish.
 */
export function isNightActivity(date: Date, offsetHours = 5): boolean {
  // UTC millisekundiga offset qo'shish
  const localTime = new Date(date.getTime() + offsetHours * 60 * 60 * 1000);
  const hour = localTime.getUTCHours();
  return hour >= 23 || hour < 6;
}

/**
 * O'rtacha javob vaqtini inson tushunadigan formatga keltirish.
 */
export function formatResponseTime(minutes: number | null): string {
  if (minutes === null || minutes < 0 || Number.isNaN(minutes)) {
    return '—';
  }
  if (minutes < 1) {
    return '1 daqiqadan kam';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} daq`;
  }
  const hours = minutes / 60;
  return `${hours.toFixed(1)} soat`;
}
