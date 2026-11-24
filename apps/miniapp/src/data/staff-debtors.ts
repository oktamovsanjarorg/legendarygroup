import type { DebtorBucket, DebtorItem, DebtorListResponse } from '@lg/contracts';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

export interface DebtorFilter {
  bucket: DebtorBucket;
  search: string;
}

/** Bitta belgi bilan qidirilmaydi — har harfda butun ro'yxat qayta so'ralmasin. */
export function debtorsPath(f: DebtorFilter, cursor: string): string {
  const q = new URLSearchParams({ bucket: f.bucket, limit: '30' });
  const search = f.search.trim();
  if (search.length >= 2) q.set('search', search);
  if (cursor) q.set('cursor', cursor);
  return `/billing/debtors?${q.toString()}`;
}

export interface DebtorsData {
  items: DebtorItem[];
  total: bigint;
}

/** MS-08: eng ko'p kechikkan birinchi (saralash — serverda). */
export function useDebtors(filter: DebtorFilter) {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: ['staff', 'debtors', debtorsPath(filter, '')],
    initialPageParam: '',
    queryFn: ({ pageParam }) => api.request<DebtorListResponse>(debtorsPath(filter, pageParam)),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    select: (d): DebtorsData => ({
      items: d.pages.flatMap((p) => p.items),
      total: BigInt(d.pages[0]?.totalDebt ?? '0'),
    }),
    placeholderData: (prev) => prev,
  });
}

export function useRemindDebtor() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DebtorItem) =>
      api.request(`/billing/debtors/${d.id}/remind`, { method: 'POST' }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['staff', 'debtors'] }),
  });
}
