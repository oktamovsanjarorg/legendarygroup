import type { StudentLedgerSummary, StudentListRow, StudentSort } from '@lg/contracts';
import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query';
import { useDebounced } from '../desk/desk-data.js';
import { useApi } from './deps.js';
import { studentHit } from './staff-map.js';

/** Sahifa — 20 ta (har biriga qarz so'rovi bor). */
const PAGE = 20;

export interface StudentFilters {
  q: string;
  /** `null` — barcha kurslar. */
  courseId: string | null;
  sort: StudentSort;
  status: 'active' | 'archived';
}

export const DEFAULT_FILTERS: StudentFilters = {
  q: '',
  courseId: null,
  sort: 'name',
  status: 'active',
};

export function studentListUrl(f: StudentFilters, cursor: string | null): string {
  const p = new URLSearchParams({ limit: String(PAGE), sort: f.sort, status: f.status });
  const q = f.q.trim();
  if (q.length >= 2) p.set('q', q);
  if (f.courseId) p.set('courseId', f.courseId);
  if (cursor) p.set('cursor', cursor);
  return `/students?${p.toString()}`;
}

/**
 * MS-04 O'quvchilar (T-177): ro'yxat — qidiruv (≥ 2 belgi), kurs (fan), tartib va holat bo'yicha;
 * sahifalab («Yana ko'rsatish»). O'quvchilar ko'payganda ham tez topiladi.
 */
export function useStudentList(f: StudentFilters) {
  const api = useApi();
  const q = useDebounced(f.q.trim());
  const filters = { ...f, q };
  return useInfiniteQuery({
    queryKey: ['staff', 'students', filters],
    initialPageParam: null as string | null,
    placeholderData: keepPreviousData,
    queryFn: async ({ pageParam }) => {
      const r = await api.request<{ items: StudentListRow[]; nextCursor: string | null }>(
        studentListUrl(filters, pageParam),
      );
      const items = await Promise.all(
        r.items.map(async (s) => {
          const sum = await api.request<StudentLedgerSummary>(`/billing/ledger/${s.id}/summary`);
          return studentHit(s, -BigInt(sum.balance));
        }),
      );
      return { items, next: r.nextCursor };
    },
    getNextPageParam: (last) => last.next ?? undefined,
    select: (d) => d.pages.flatMap((p) => p.items),
  });
}
