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
  permissions: [],
};

/** Parol → TOTP bosqichi + Telegram so'rovi; bot `pendingPolls` martadan keyin tasdiqlaydi. */
function fakeApi(opts: { challenge?: string; pendingPolls: number }) {
  let polls = 0;
  let authed = false;
  vi.stubGlobal('fetch', async (url: string) => {
    const path = String(url).replace('/api', '');
    if (path === '/auth/refresh')
      return authed ? json(200, { accessToken: 'acc' }) : json(401, { code: 'SESSION_EXPIRED' });
    if (path === '/auth/login')
      return json(200, { next: 'totp', mfaToken: 'mfa', telegramChallengeId: opts.challenge });
    if (path === '/auth/telegram/poll') {
      polls += 1;
      if (polls <= opts.pendingPolls) return json(202, { code: 'TELEGRAM_LOGIN_PENDING' });
      authed = true;
      return json(200, { next: 'done', accessToken: 'acc', user: me });
    }
    if (path === '/auth/me') return json(200, me);
    return json(404, { code: 'NOT_FOUND' });
  });
  return { polls: () => polls };
}

async function loginWithPassword() {
  const router = createAppRouter(createMemoryHistory({ initialEntries: ['/login'] }));
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>,
  );
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText(t.login.password), 'correct-password');
  await user.click(screen.getByRole('button', { name: t.login.submit }));
  return router;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('W-02 + Telegram tasdigʻi (T-122)', () => {
  it('parol → kod sahifasida Telegram xabari; botda tasdiqlansa — kodsiz bosh sahifa', async () => {
    fakeApi({ challenge: 'c-1', pendingPolls: 0 });
    const router = await loginWithPassword();
    await waitFor(() => expect(router.state.location.pathname).toBe('/'));
  });

  it('tasdiq kutilayotganda — kod maydoni va izoh birga koʻrinadi', async () => {
    fakeApi({ challenge: 'c-1', pendingPolls: 1000 });
    await loginWithPassword();
    expect(await screen.findByText(t.totp.telegramSent)).toBeTruthy();
    expect(screen.getByLabelText(t.totp.code)).toBeTruthy();
  });

  it('Telegram ulanmagan — izoh yoʻq, soʻrov ketmaydi', async () => {
    const api = fakeApi({ pendingPolls: 0 });
    await loginWithPassword();
    expect(await screen.findByLabelText(t.totp.code)).toBeTruthy();
    expect(screen.queryByText(t.totp.telegramSent)).toBeNull();
    expect(api.polls()).toBe(0);
  });
});
