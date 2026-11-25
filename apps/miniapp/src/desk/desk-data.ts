import type { StudentListRow } from '@lg/contracts';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useApi } from '../data/deps.js';

/** Har harf bosilganda so'rov ketmasin — yozish to'xtagach. */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/** Buyruqlar oynasi uchun tezkor o'quvchi qidiruvi (qarzsiz — yengil; ≤ 6 natija). */
export function useQuickStudents(raw: string) {
  const api = useApi();
  const q = useDebounced(raw.trim());
  return useQuery({
    queryKey: ['desk', 'students', q],
    enabled: q.length >= 2,
    staleTime: 30_000,
    queryFn: async () =>
      (
        await api.request<{ items: StudentListRow[] }>(
          `/students?q=${encodeURIComponent(q)}&limit=6`,
        )
      ).items,
  });
}
