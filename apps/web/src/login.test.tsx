import { webMessages as t } from '@lg/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
  permissions: ['audit.view'],
};

/** Soxta API: login → totp → sessiya. */
function fakeApi() {
  let authed = false;
  const calls: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    calls.push(path);
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, string>) : {};
    if (path === '/auth/refresh')
      return authed ? json(200, { accessToken: 'acc' }) : json(401, { code: 'SESSION_EXPIRED' });
    if (path === '/auth/login') {
      return body['password'] === 'correct-password'
        ? json(200, { next: 'totp', mfaToken: 'mfa' })
        : json(401, {
            code: 'INVALID_CREDENTIALS',
            message: 'Telefon raqam yoki parol notoʻgʻri.',
          });
    }
    if (path === '/auth/totp/verify') {
      if (body['code'] !== '123456')
        return json(401, { code: 'INVALID_TOTP', message: 'Tasdiqlash kodi notoʻgʻri.' });
      authed = true;
      return json(200, { next: 'done', accessToken: 'acc', user: me });
    }
    if (path === '/auth/me') return json(200, me);
    return json(404, { code: 'NOT_FOUND' });
  });
  return calls;
}

function renderApp(path = '/login') {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
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

describe('W-01/W-02 kirish oqimi', () => {
  it("noto'g'ri parol — i18n xato matni maydon yonida", async () => {
    fakeApi();
    renderApp();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(t.login.password), 'wrong-password');
    await user.click(screen.getByRole('button', { name: t.login.submit }));
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Telefon raqam yoki parol notoʻgʻri.',
    );
  });

  it('parol → TOTP → bosh sahifa (ruxsatga qarab menyu)', async () => {
    fakeApi();
    const router = renderApp();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(t.login.password), 'correct-password');
    await user.click(screen.getByRole('button', { name: t.login.submit }));
    await user.type(await screen.findByLabelText(t.totp.code), '000000');
    await user.click(screen.getByRole('button', { name: t.totp.submit }));
    expect((await screen.findByRole('alert')).textContent).toBe('Tasdiqlash kodi notoʻgʻri.');
    const input = screen.getByLabelText(t.totp.code);
    await user.clear(input);
    await user.type(input, '123456');
    await user.click(screen.getByRole('button', { name: t.totp.submit }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(
      await screen.findByText(t.home.greeting.replace('{name}', 'Bosh Direktor')),
    ).toBeTruthy();
    expect(screen.getByRole('link', { name: t.nav.sessions })).toBeTruthy();
  });

  it("kirmagan foydalanuvchi himoyalangan sahifadan /login'ga", async () => {
    fakeApi();
    const router = renderApp('/sessions');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
