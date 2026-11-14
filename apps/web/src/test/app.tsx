import type { Permission } from '@lg/contracts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '../auth/auth.js';
import { createAppRouter } from '../router.js';

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
export const noContent = () => new Response(null, { status: 204 });

export interface Call {
  method: string;
  path: string;
  body: unknown;
}
/** Ekran so'rovlariga javob; `undefined` — 404. */
export type Handler = (call: Call) => Response | undefined;

/**
 * Kirgan foydalanuvchi bilan soxta API (ekran testlari uchun): auth so'rovlari tayyor,
 * qolgani — `handler`. Qaytadi: yuborilgan so'rovlar jurnali.
 */
export function fakeApi(permissions: readonly Permission[], handler: Handler): Call[] {
  const me = {
    id: 'u1',
    fullName: 'Bosh Direktor',
    phone: '+998901000001',
    roles: ['director'],
    activeRole: 'director',
    permissions,
  };
  const calls: Call[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    if (path === '/auth/refresh') return json(200, { accessToken: 'acc' });
    if (path === '/auth/me') return json(200, me);
    const call: Call = {
      method: init?.method ?? 'GET',
      path,
      body: init?.body ? (JSON.parse(String(init.body)) as unknown) : undefined,
    };
    calls.push(call);
    return handler(call) ?? json(404, { code: 'NOT_FOUND', message: 'Topilmadi.' });
  });
  return calls;
}

export function renderApp(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return router;
}
