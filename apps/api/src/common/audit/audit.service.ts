import { Inject, Injectable } from '@nestjs/common';
import type { RoleCode } from '@lg/contracts';
import { auditLogs, type Database, type Transaction } from '@lg/db';
import type { Clock } from '@lg/domain';
import { CLOCK_TOKEN } from '../clock/clock.tokens.js';
import { DB_TOKEN } from '../db/db.tokens.js';

export interface AuditContext {
  actorId: string | null;
  actorRole: RoleCode | null;
  ip: string | null;
  userAgent: string | null;
  requestId: string | null;
}

export interface AuditEntry {
  /** `<entity>.<verb>`, masalan `auth.login` (12-ai-playbook.md §5). */
  action: string;
  entity: string;
  entityId?: string | null;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}

/**
 * `audit_logs`ga yozish (FR-AUD-1; faqat INSERT). Yozish amali bilan bir tranzaksiyada
 * chaqirilsa — `tx` uzatiladi. Sir va PII (parol, token, kod) bu yerga yozilmaydi.
 * T-008: barcha yozish endpoint'lari uchun interceptor shu servisdan foydalanadi.
 */
@Injectable()
export class AuditService {
  constructor(
    @Inject(DB_TOKEN) private readonly db: Database,
    @Inject(CLOCK_TOKEN) private readonly clock: Clock,
  ) {}

  async record(
    ctx: AuditContext,
    entry: AuditEntry,
    tx: Transaction | Database = this.db,
  ): Promise<void> {
    await tx.insert(auditLogs).values({
      ...ctx,
      action: entry.action,
      entity: entry.entity,
      entityId: entry.entityId ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      at: this.clock.now(),
    });
  }
}
