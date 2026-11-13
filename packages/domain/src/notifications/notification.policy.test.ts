import { describe, expect, it } from 'vitest';
import {
  isNotificationMandatory,
  renderNotificationTemplate,
  validatePreferenceUpdate,
} from './notification.policy.js';

describe('Notification Domain Policy (FR-RPT-4)', () => {
  describe('isNotificationMandatory & validatePreferenceUpdate', () => {
    it('kelmadi va toʻlov bildirishnomalari majburiy (oʻchirib boʻlmaydi)', () => {
      expect(isNotificationMandatory('attendance_absent')).toBe(true);
      expect(isNotificationMandatory('billing_invoice_created')).toBe(true);
      expect(isNotificationMandatory('billing_payment_confirmed')).toBe(true);

      const res = validatePreferenceUpdate('attendance_absent', false);
      expect(res.valid).toBe(false);
      expect(res.reason).toContain('oʻchirib boʻlmaydi');
    });

    it('ixtiyoriy bildirishnomalarni yoqish/oʻchirish mumkin', () => {
      expect(isNotificationMandatory('grade_recorded')).toBe(false);
      expect(isNotificationMandatory('announcement')).toBe(false);

      const resOff = validatePreferenceUpdate('grade_recorded', false);
      expect(resOff.valid).toBe(true);

      const resOn = validatePreferenceUpdate('grade_recorded', true);
      expect(resOn.valid).toBe(true);
    });
  });

  describe('renderNotificationTemplate', () => {
    it('kelmadi shablonini toʻgʻri formatlaydi', () => {
      const rendered = renderNotificationTemplate('attendance_absent', {
        studentName: 'Ali Valiyev',
        groupName: 'Ingliz tili B2',
        date: '2026-11-13',
      });

      expect(rendered.title).toBe('Davomat: Darsga kelmadi');
      expect(rendered.body).toContain('Ali Valiyev');
      expect(rendered.body).toContain('Ingliz tili B2');
    });

    it('toʻlov tasdiqlandi shablonini toʻgʻri formatlaydi', () => {
      const rendered = renderNotificationTemplate('billing_payment_confirmed', {
        studentName: 'Ali Valiyev',
        amount: '800 000',
      });

      expect(rendered.title).toBe('Toʻlov tasdiqlandi');
      expect(rendered.body).toContain('800 000 soʻm toʻlov muvaffaqiyatli qabul qilindi');
    });
  });
});
