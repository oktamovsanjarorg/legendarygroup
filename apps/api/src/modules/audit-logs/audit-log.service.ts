import type {
  AuditLogItem,
  ListAuditLogsQuery,
  StaffActivityItem,
  SuspiciousActivityItem,
} from '@lg/contracts';
import { Inject, Injectable } from '@nestjs/common';
import type { RequestUser } from '../auth/index.js';
import { mapAuditLogRow, mapStaffStats, mapSuspiciousRow } from './audit-log.mappers.js';
import { AuditLogRepository } from './audit-log.repository.js';

@Injectable()
export class AuditLogService {
  constructor(@Inject(AuditLogRepository) private readonly repo: AuditLogRepository) {}

  async listAuditLogs(_actor: RequestUser, query: ListAuditLogsQuery): Promise<AuditLogItem[]> {
    const rows = await this.repo.findAuditLogs({
      actorId: query.actorId,
      action: query.action,
      entity: query.entity,
      from: query.from,
      to: query.to,
      limit: query.limit,
      offset: query.offset,
    });
    return rows.map(mapAuditLogRow);
  }

  async listSuspiciousActivities(
    _actor: RequestUser,
    limit = 50,
  ): Promise<SuspiciousActivityItem[]> {
    const rows = await this.repo.findSuspiciousLogs(limit);
    return rows.map(mapSuspiciousRow);
  }

  async getStaffActivity(_actor: RequestUser, period?: string): Promise<StaffActivityItem[]> {
    const rows = await this.repo.getStaffActivity(period);
    return rows.map(mapStaffStats);
  }
}
