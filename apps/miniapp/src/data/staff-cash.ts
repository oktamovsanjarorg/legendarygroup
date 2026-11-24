import type { CashClosing, CashDay, CloseCashInput } from '@lg/contracts';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useApi } from './deps.js';

const KEY = ['staff', 'cash'] as const;
const PAGE = 14;

/** MS-16: kun — doim serverdan (boshqa xodim to'lov kiritgan bo'lishi mumkin). */
export function useCashDay(date: string) {
  const api = useApi();
  return useQuery({
    queryKey: [...KEY, 'day', date],
    queryFn: () => api.request<CashDay>(`/billing/cash/day?date=${date}`),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
  });
}

export function useCashHistory() {
  const api = useApi();
  return useInfiniteQuery({
    queryKey: [...KEY, 'closings'],
    initialPageParam: '',
    queryFn: ({ pageParam }) =>
      api.request<CashClosing[]>(
        `/billing/cash/closings?limit=${PAGE}${pageParam ? `&cursor=${pageParam}` : ''}`,
      ),
    getNextPageParam: (last) => (last.length < PAGE ? undefined : last.at(-1)?.date),
    select: (d) => d.pages.flat(),
  });
}

export function useCloseCash() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CloseCashInput) =>
      api.request('/billing/cash/close', { method: 'POST', body }),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export interface CashForm {
  counted: bigint | null;
  note: string;
}

/** Yopish sharti: summa sanalgan, farq bo'lsa — izoh (server ham tekshiradi). */
export const cashReady = (f: CashForm, expected: bigint): boolean =>
  f.counted !== null && (f.counted === expected || f.note.trim().length >= 3);
