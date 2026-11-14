import type { PublicSettings, SystemSettings } from '@lg/contracts';

export interface SystemSettingsResponse extends Omit<SystemSettings, 'penaltyConfig'> {
  penaltyConfig: Omit<SystemSettings['penaltyConfig'], 'penaltyPerLesson'> & {
    penaltyPerLesson: string;
  };
}

export function toSystemSettingsResponse(s: SystemSettings): SystemSettingsResponse {
  return {
    ...s,
    penaltyConfig: {
      ...s.penaltyConfig,
      penaltyPerLesson: s.penaltyConfig.penaltyPerLesson.toString(),
    },
  };
}

export function toPublicSettings(s: SystemSettings): PublicSettings {
  return {
    centerInfo: s.centerInfo,
    paymentCards: s.paymentCards,
    billingDueDay: s.billingDueDay,
  };
}

export const SETTINGS_AUDIT_KEYS = [
  'centerInfo',
  'paymentCards',
  'billingDueDay',
  'penaltyConfig',
  'notificationTimes',
  'absenceNoticeWindowMinutes',
  'adminDiscountLimitPercent',
] as const;
