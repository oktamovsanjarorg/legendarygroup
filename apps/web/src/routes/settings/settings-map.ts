import type { SystemSettings, UpdateSystemSettings } from '@lg/contracts';
import type { CenterSettings, SettingsSection } from '../../screens/f1/settings.js';

const primary = (s: SystemSettings) => s.paymentCards.find((c) => c.isPrimary) ?? s.paymentCards[0];

export const toForm = (s: SystemSettings): CenterSettings => ({
  name: s.centerInfo.name,
  phone: s.centerInfo.phone,
  address: s.centerInfo.address ?? '',
  card: primary(s)?.cardNumber ?? '',
  cardHolder: primary(s)?.holderName ?? '',
  bankName: primary(s)?.bankName ?? '',
  dueDay: s.billingDueDay,
  adminDiscountLimit: s.adminDiscountLimitPercent,
  lateThreshold: s.penaltyConfig.lateThresholdMin,
  reminderAfter: s.notificationTimes.attendanceReminderMinutes,
});

/**
 * Bo'lim bo'yicha PATCH (FR-SYS-1): faqat shu bo'lim maydonlari. Karta — asosiy karta
 * almashtiriladi (boshqa kartalar saqlanadi); bo'sh karta — o'zgartirilmaydi.
 */
export function toPatch(
  section: SettingsSection,
  f: CenterSettings,
  cur: SystemSettings,
  newId: () => string,
): UpdateSystemSettings | null {
  switch (section) {
    case 'center':
      return { centerInfo: { name: f.name, phone: f.phone, address: f.address.trim() || null } };
    case 'billing': {
      const p = { billingDueDay: f.dueDay, adminDiscountLimitPercent: f.adminDiscountLimit };
      const card = f.card.replace(/\s/g, '');
      if (!card) return p;
      const old = primary(cur);
      const rest = cur.paymentCards.filter((c) => c.id !== old?.id);
      const next = {
        id: old?.id ?? newId(),
        cardNumber: card,
        holderName: f.cardHolder,
        bankName: f.bankName,
        isPrimary: true,
      };
      return { ...p, paymentCards: [next, ...rest.map((c) => ({ ...c, isPrimary: false }))] };
    }
    case 'attendance':
      return {
        penaltyConfig: { lateThresholdMin: f.lateThreshold },
        notificationTimes: { attendanceReminderMinutes: f.reminderAfter },
      };
    case 'holidays':
      return null;
  }
}
