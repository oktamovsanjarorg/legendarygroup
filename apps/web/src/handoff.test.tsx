import { webMessages as t } from '@lg/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from './auth/auth.js';
import { createAppRouter } from './router.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const me = {
  id: 'u1',
  fullName: 'Bosh Direktor',
  phone: '+998901112233',
  roles: ['director'],
  activeRole: 'director',
  permissions: [],
};

/** Soxta API: kalit faqat bir marta sessiyaga almashadi. */
function fakeApi(valid: string) {
  let used = false;
  const redeemed: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    if (path === '/auth/refresh') return json(401, { code: 'SESSION_EXPIRED' });
    if (path === '/auth/panel-handoff/redeem') {
      const { token } = JSON.parse(String(init?.body)) as { token: string };
      redeemed.push(token);
      if (token !== valid || used)
        return json(401, { code: 'PANEL_HANDOFF_INVALID', message: 'Yaroqsiz.' });
      used = true;
      return json(200, { next: 'done', accessToken: 'acc', user: me });
    }
    if (path === '/auth/me') return json(200, me);
    return json(404, { code: 'NOT_FOUND' });
  });
  return redeemed;
}

function open(hash: string) {
  window.history.replaceState(null, '', `/handoff${hash}`);
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/handoff'] }));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  return router;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-03a Mini App → web panel (T-121)', () => {
  it('kalit → sessiya → bosh sahifa; kalit manzildan olib tashlanadi, bitta soʻrov', async () => {
    const redeemed = fakeApi('k'.repeat(43));
    const router = open(`#t=${'k'.repeat(43)}`);
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(window.location.hash).toBe('');
    expect(redeemed).toEqual(['k'.repeat(43)]);
    expect(
      await screen.findByText(t.home.greeting.replace('{name}', 'Bosh Direktor')),
    ).toBeTruthy();
  });

  it('yaroqsiz kalit — xato va parol bilan kirish tugmasi', async () => {
    fakeApi('boshqa');
    open(`#t=${'x'.repeat(43)}`);
    expect(await screen.findByText('Yaroqsiz.')).toBeTruthy();
    expect(screen.getByRole('button', { name: t.handoff.toLogin })).toBeTruthy();
  });

  it('kalitsiz ochilgan — soʻrov ketmaydi, tushunarli xato', async () => {
    const redeemed = fakeApi('k');
    open('');
    expect(await screen.findByText(t.handoff.missing)).toBeTruthy();
    expect(redeemed).toEqual([]);
  });
});
