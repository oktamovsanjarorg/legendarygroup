import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SYSTEM_SETTINGS,
  SystemSettingsSchema,
  UpdateSystemSettingsSchema,
} from './settings.js';

describe('settings contracts (T-115, FR-SYS-1)', () => {
  it('standart sozlamalar sxemadan toʻliq oʻtadi', () => {
    const parsed = SystemSettingsSchema.safeParse(DEFAULT_SYSTEM_SETTINGS);
    expect(parsed.success).toBe(true);
  });

  it('notoʻgʻri telefon rad etiladi', () => {
    const invalid = {
      ...DEFAULT_SYSTEM_SETTINGS,
      centerInfo: {
        ...DEFAULT_SYSTEM_SETTINGS.centerInfo,
        phone: '12345',
      },
    };
    const parsed = SystemSettingsSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('notoʻgʻri billingDueDay (1..28 oraligʻida boʻlmagan) rad etiladi', () => {
    const invalid = {
      ...DEFAULT_SYSTEM_SETTINGS,
      billingDueDay: 31,
    };
    const parsed = SystemSettingsSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('notoʻgʻri vaqt formati rad etiladi', () => {
    const invalid = {
      ...DEFAULT_SYSTEM_SETTINGS,
      notificationTimes: {
        ...DEFAULT_SYSTEM_SETTINGS.notificationTimes,
        morningReminderTime: '25:99',
      },
    };
    const parsed = SystemSettingsSchema.safeParse(invalid);
    expect(parsed.success).toBe(false);
  });

  it('UpdateSystemSettingsSchema boʻsh obyektni rad etadi', () => {
    const parsed = UpdateSystemSettingsSchema.safeParse({});
    expect(parsed.success).toBe(false);
  });

  it('UpdateSystemSettingsSchema qisman yangilanishni qabul qiladi', () => {
    const parsed = UpdateSystemSettingsSchema.safeParse({
      billingDueDay: 15,
      centerInfo: { name: 'New Name' },
    });
    expect(parsed.success).toBe(true);
  });
});
