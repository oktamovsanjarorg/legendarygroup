import { Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_SYSTEM_SETTINGS,
  type PublicSettings,
  type SystemSettings,
  SystemSettingsSchema,
  type UpdateSystemSettings,
} from '@lg/contracts';
import type { Clock } from '@lg/domain';
import { changedFields } from '../../common/audit/audit-diff.js';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { SettingsRepository } from './settings.repository.js';
import { SETTINGS_AUDIT_KEYS, toPublicSettings } from './settings.serializer.js';

const SYSTEM_SETTINGS_KEY = 'system';

@Injectable()
export class SettingsService {
  constructor(
    @Inject(SettingsRepository) private readonly repo: SettingsRepository,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getSettings(): Promise<SystemSettings> {
    const row = await this.repo.getRaw(SYSTEM_SETTINGS_KEY);
    if (!row) {
      return DEFAULT_SYSTEM_SETTINGS;
    }
    return SystemSettingsSchema.parse(row.value);
  }

  async getPublicSettings(): Promise<PublicSettings> {
    const settings = await this.getSettings();
    return toPublicSettings(settings);
  }

  async updateSettings(ctx: AuditContext, patch: UpdateSystemSettings): Promise<SystemSettings> {
    const current = await this.getSettings();

    const merged = {
      centerInfo: patch.centerInfo
        ? { ...current.centerInfo, ...patch.centerInfo }
        : current.centerInfo,
      paymentCards: patch.paymentCards ?? current.paymentCards,
      billingDueDay: patch.billingDueDay ?? current.billingDueDay,
      penaltyConfig: patch.penaltyConfig
        ? { ...current.penaltyConfig, ...patch.penaltyConfig }
        : current.penaltyConfig,
      notificationTimes: patch.notificationTimes
        ? { ...current.notificationTimes, ...patch.notificationTimes }
        : current.notificationTimes,
      absenceNoticeWindowMinutes:
        patch.absenceNoticeWindowMinutes ?? current.absenceNoticeWindowMinutes,
      adminDiscountLimitPercent:
        patch.adminDiscountLimitPercent ?? current.adminDiscountLimitPercent,
    };

    const validated = SystemSettingsSchema.parse(merged);

    // Audit diff tayyorlash uchun bigint maydonlarini stringga aylantiramiz
    const currentPlain = this.toPlain(current);
    const validatedPlain = this.toPlain(validated);
    const diff = changedFields(currentPlain, validatedPlain, SETTINGS_AUDIT_KEYS);

    await this.audit.record(ctx, {
      action: 'settings.update',
      entity: 'settings',
      entityId: SYSTEM_SETTINGS_KEY,
      before: diff.before,
      after: diff.after,
    });

    await this.repo.upsertRaw({
      key: SYSTEM_SETTINGS_KEY,
      value: validatedPlain,
      updatedBy: ctx.actorId,
      updatedAt: this.clock.now(),
    });

    return validated;
  }

  private toPlain(s: SystemSettings): Record<string, unknown> {
    return {
      ...s,
      penaltyConfig: {
        ...s.penaltyConfig,
        penaltyPerLesson: s.penaltyConfig.penaltyPerLesson.toString(),
      },
    };
  }
}
