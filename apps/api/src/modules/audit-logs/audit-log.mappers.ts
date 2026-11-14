import type {
  AuditDiffItem,
  AuditLogItem,
  StaffActivityItem,
  SuspiciousActivityItem,
} from '@lg/contracts';
import { evaluateActionSuspicion, formatResponseTime, isNightActivity } from '@lg/domain';
import type { RawAuditLogRow, RawStaffStats } from './audit-log.repository.js';

export function calculateAuditDiff(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
): AuditDiffItem[] | undefined {
  if (!before && !after) return undefined;
  const b = before ?? {};
  const a = after ?? {};
  const allKeys = Array.from(new Set([...Object.keys(b), ...Object.keys(a)]));

  const diffs: AuditDiffItem[] = [];
  for (const key of allKeys) {
    const valB = b[key];
    const valA = a[key];
    if (JSON.stringify(valB) !== JSON.stringify(valA)) {
      diffs.push({ field: key, before: valB ?? null, after: valA ?? null });
    }
  }
  return diffs.length > 0 ? diffs : undefined;
}

export function mapAuditLogRow(row: RawAuditLogRow): AuditLogItem {
  const diff = calculateAuditDiff(row.before, row.after);
  return {
    id: row.id,
    timestamp: row.at.toISOString(),
    actorId: row.actorId,
    userName: row.actorName ?? 'Tizim',
    userRole: row.actorRole ?? 'system',
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
    target: `${row.entity}:${row.entityId ?? '-'}`,
    ip: row.ip,
    userAgent: row.userAgent,
    diff,
  };
}

export function mapSuspiciousRow(row: RawAuditLogRow): SuspiciousActivityItem {
  const actionMatch = evaluateActionSuspicion(row.action);
  const night = isNightActivity(row.at);

  let title = actionMatch.title ?? 'Shubhali amal';
  let description = actionMatch.description ?? 'Nomaʼlum xavf darajasidagi amal.';
  let riskLevel = actionMatch.riskLevel ?? 'medium';

  if (!actionMatch.suspicious && night) {
    title = 'Tunda bajarilgan amal';
    description = 'Amal ish vaqtidan tashqari (tunda) bajarildi.';
    riskLevel = 'medium';
  }

  return {
    id: row.id,
    title,
    description,
    riskLevel,
    timestamp: row.at.toISOString(),
    userName: row.actorName ?? 'Tizim',
    actorId: row.actorId,
    action: row.action,
    entity: row.entity,
    entityId: row.entityId,
  };
}

export function mapStaffStats(row: RawStaffStats): StaffActivityItem {
  return {
    staffId: row.staffId,
    staffName: row.staffName,
    role: row.role as StaffActivityItem['role'],
    paymentsCount: row.paymentsCount,
    approvalsCount: row.approvalsCount,
    avgResponseTimeMinutes: row.avgResponseMinutes ? Math.round(row.avgResponseMinutes) : null,
    avgResponseTimeFormatted: formatResponseTime(row.avgResponseMinutes),
  };
}
