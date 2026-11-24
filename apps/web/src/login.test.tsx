import { webMessages as t } from '@lg/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, RouterProvider } from '@tanstack/react-router';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
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

/** Soxta API: telegram/start → `pendingPolls` marta kutish → sessiya. */
function fakeApi(pendingPolls = 0, once = false) {
  let authed = false;
  let polls = 0;
  const started: string[] = [];
  const poll = () => {
    polls += 1;
    // Server tasdiqni bir marta beradi (GETDEL) — ikkinchi so'rov 401.
    if (once && polls > 1) return json(401, { code: 'INVALID_MFA_TOKEN', message: 'tugadi' });
    if (polls <= pendingPolls) return json(202, { code: 'TELEGRAM_LOGIN_PENDING' });
    authed = true;
    return json(200, { next: 'done', accessToken: 'acc', user: me });
  };
  const routes: Record<string, (body: Record<string, string>) => Response> = {
    '/auth/refresh': () =>
      authed ? json(200, { accessToken: 'acc' }) : json(401, { code: 'SESSION_EXPIRED' }),
    '/auth/telegram/start': (body) => {
      started.push(body['phone'] ?? '');
      return json(200, { challengeId: 'c-1', expiresAt: '2026-11-24T10:00:00Z' });
    },
    '/auth/telegram/poll': poll,
    '/settings/public': () => json(200, { botUrl: 'https://t.me/lg_bot' }),
    '/auth/me': () => json(200, me),
  };
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, string>) : {};
    const route = routes[String(url).replace('/api', '')];
    return route ? route(body) : json(404, { code: 'NOT_FOUND' });
  });
  return started;
}

function renderApp(path = '/login', strict = false) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  const app = (
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
  render(strict ? <StrictMode>{app}</StrictMode> : app);
  return router;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-01 kirish: faqat Telegram (Q-98)', () => {
  const submit = async (phone: string) => {
    const user = userEvent.setup();
    const field = await screen.findByLabelText(t.login.phone);
    await user.clear(field);
    await user.type(field, phone);
    await user.click(screen.getByRole('button', { name: t.login.viaTelegram }));
  };

  it('parol maydoni yoʻq; notoʻgʻri raqam — API chaqirilmaydi', async () => {
    const started = fakeApi();
    renderApp();
    await submit('123');
    expect((await screen.findByRole('alert')).textContent).toBe(t.staff.form.phoneInvalid);
    expect(document.querySelector('input[type=password]')).toBeNull();
    expect(started).toEqual([]);
  });

  it('telefon normalizatsiya qilinadi → botda tasdiq → bosh sahifa', async () => {
    const started = fakeApi();
    const router = renderApp();
    await submit('90 111 22 33');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
    expect(started).toEqual(['+998901112233']);
    expect(
      await screen.findByText(t.home.greeting.replace('{name}', 'Bosh Direktor')),
    ).toBeTruthy();
  });

  it('REGRESSIYA: ikki marta mount (StrictMode) — tasdiq bitta soʻrovda olinadi, yoʻqolmaydi', async () => {
    fakeApi(0, true);
    const router = renderApp('/login', true);
    await submit('+998901112233');
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('kutish ekrani: xabar kelmasa nima qilish va bot havolasi; orqaga — forma', async () => {
    fakeApi(1000);
    renderApp();
    await submit('+998901112233');
    expect(await screen.findByText(t.login.noMessage)).toBeTruthy();
    const link = await screen.findByRole('link', { name: t.login.openBot });
    expect(link.getAttribute('href')).toBe('https://t.me/lg_bot');
    await userEvent.setup().click(screen.getByRole('button', { name: t.login.telegramCancel }));
    expect(await screen.findByLabelText(t.login.phone)).toBeTruthy();
  });

  it("kirmagan foydalanuvchi himoyalangan sahifadan /login'ga", async () => {
    fakeApi();
    const router = renderApp('/sessions');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
