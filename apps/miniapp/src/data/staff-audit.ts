import type { AuditLogItem, StaffActivityItem, SuspiciousActivityItem } from '@lg/contracts';
import type { miniappMessages as t } from '@lg/i18n';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'audit'] as const;
const PAGE = 50;
export type AuditFilter = keyof typeof t.audit.filters;

/** Amal kodi prefiksi (`GET /audit/logs?action=`). */
const PREFIX: Record<AuditFilter, string> = {
  all: '',
  billing: 'billing.',
  student: 'student.',
  enrollment: 'enrollment.',
  attendance: 'attendance.',
  lesson: 'lesson.',
  user: 'user.',
  auth: 'auth.',
  settings: 'settings.',
};

/** Diff qiymati matni: `null` — tire, obyekt — JSON. */
export function diffText(v: unknown): string {
  if (v === null || v === undefined || v === '') return '—';
  return typeof v === 'object' ? JSON.stringify(v) : String(v);
}

export function useAuditLog(filter: AuditFilter) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: [...KEY, 'log', filter],
    queryFn: ({ pageParam }) =>
      api.request<AuditLogItem[]>(
        `/audit/logs?limit=${PAGE}&offset=${pageParam}${filter === 'all' ? '' : `&action=${PREFIX[filter]}`}`,
      ),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.length < PAGE ? undefined : pages.length * PAGE),
  });
}

export function useSuspicious() {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'suspicious'],
    queryFn: () => api.request<SuspiciousActivityItem[]>('/audit/suspicious?limit=100'),
  });
}

export function useStaffActivity(period: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'staff', period],
    queryFn: () => api.request<StaffActivityItem[]>(`/audit/staff-activity?period=${period}`),
  });
}
