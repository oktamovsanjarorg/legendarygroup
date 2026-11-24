import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from './deps.js';

export interface StaffCall {
  path: string;
  method?: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: object;
  /** Takror yuborishda ikkinchi marta bajarilmasligi shart bo'lgan amal (pul). */
  idempotencyKey?: string;
}

/** Xodim yozish amali: tugagach (xato bo'lsa ham) xodim ma'lumotlari yangilanadi. */
export function useStaffCall<T = unknown>() {
  const api = useApi();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (c: StaffCall) =>
      api.request<T>(c.path, {
        method: c.method ?? 'POST',
        ...(c.body ? { body: c.body } : {}),
        ...(c.idempotencyKey ? { headers: { 'idempotency-key': c.idempotencyKey } } : {}),
      }),
    onSettled: () => qc.invalidateQueries({ queryKey: ['staff'] }),
  });
}
