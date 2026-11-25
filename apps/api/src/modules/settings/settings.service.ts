import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  DEFAULT_SYSTEM_SETTINGS,
  type PublicSettings,
  type SystemSettings,
  SystemSettingsSchema,
  type UpdateSystemSettings,
} from '@lg/contracts';
import type { Database, Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { sql } from 'drizzle-orm';
import { changedFields } from '../../common/audit/audit-diff.js';
import { type AuditContext, AuditService } from '../../common/audit/audit.service.js';
import { CLOCK_TOKEN } from '../../common/clock/clock.tokens.js';
import { DB_TOKEN } from '../../common/db/db.tokens.js';
import { AppException } from '../../common/errors/app.exception.js';
import { FilesService } from '../files/index.js';
import { SettingsRepository } from './settings.repository.js';
import { SETTINGS_AUDIT_KEYS, toPublicSettings } from './settings.serializer.js';

const SYSTEM_SETTINGS_KEY = 'system';

function merge(current: SystemSettings, patch: UpdateSystemSettings): SystemSettings {
  return {
    ...current,
    ...patch,
    centerInfo: { ...current.centerInfo, ...patch.centerInfo },
    penaltyConfig: { ...current.penaltyConfig, ...patch.penaltyConfig },
    notificationTimes: { ...current.notificationTimes, ...patch.notificationTimes },
  };
}

@Injectable()
export class SettingsService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(SettingsRepository) private readonly repo: SettingsRepository,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
    @Inject(AuditService) private readonly audit: AuditService,
  ) {}

  async getSettings(tx?: Transaction): Promise<SystemSettings> {
    const row = await this.repo.getRaw(SYSTEM_SETTINGS_KEY, tx);
    if (!row) {
      return DEFAULT_SYSTEM_SETTINGS;
    }
    return SystemSettingsSchema.parse(row.value);
  }

  /** Davr hisobining to'lov muddati (BR-2): sozlangan kun; oldingi hisoblar o'zgarmaydi. */
  async dueDateOf(period: string): Promise<string> {
    const { billingDueDay } = await this.getSettings();
    return `${period}-${String(billingDueDay).padStart(2, '0')}`;
  }

  async getPublicSettings(): Promise<Omit<PublicSettings, 'botUrl'>> {
    const settings = await this.getSettings();
    return toPublicSettings(settings);
  }

  async updateSettings(ctx: AuditContext, patch: UpdateSystemSettings): Promise<SystemSettings> {
    if (patch.centerInfo?.logoFileId) await this.assertLogo(patch.centerInfo.logoFileId);
    return this.db.transaction(async (tx) => {
      // Ikki bo'lim bir vaqtda saqlansa, biri ikkinchisini bekor qilmasin.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('settings.system'))`);
      const current = await this.getSettings(tx);
      const next = SystemSettingsSchema.parse(merge(current, patch));
      const value = this.toPlain(next);
      const diff = changedFields(this.toPlain(current), value, SETTINGS_AUDIT_KEYS);
      await this.audit.record(
        ctx,
        {
          action: 'settings.update',
          entity: 'settings',
          entityId: SYSTEM_SETTINGS_KEY,
          before: diff.before,
          after: diff.after,
        },
        tx,
      );
      await this.repo.upsertRaw({
        key: SYSTEM_SETTINGS_KEY,
        value,
        updatedBy: ctx.actorId,
        updatedAt: this.clock.now(),
        tx,
      });
      return next;
    });
  }

  private async assertLogo(fileId: string): Promise<void> {
    if ((await this.files.purposeOf(fileId)) !== 'center_logo')
      throw new AppException(HttpStatus.UNPROCESSABLE_ENTITY, 'FILE_NOT_ALLOWED');
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
