import { appWebApp } from './test-webapp.js';
import type { RoleCode } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

interface FakeOpts {
  roles: RoleCode[] | null;
  /** `/auth/me` birinchi chaqiruvda 401 (token eskirgan). */
  expireOnce?: boolean;
}

const profile = (roles: RoleCode[], activeRole: RoleCode) => ({
  id: 'u1',
  fullName: 'Ali Valiyev',
  phone: '+998901112233',
  roles,
  activeRole,
});

/** `POST /auth/telegram` — T-007 qoidalari: bitta rol → done, ko'p → choose_role. */
function exchange(roles: RoleCode[] | null, role?: RoleCode): Response {
  if (!roles) return json(401, { code: 'TELEGRAM_NOT_LINKED', message: 'bogʻlanmagan' });
  const active = role ?? (roles.length === 1 ? roles[0] : undefined);
  if (!active) return json(200, { next: 'choose_role', roles });
  return json(200, { next: 'done', accessToken: `t-${active}`, user: profile(roles, active) });
}

/** Soxta API: `POST /auth/telegram` va `GET /auth/me` (token → faol rol). */
function fakeApi({ roles, expireOnce }: FakeOpts) {
  const calls: string[] = [];
  let expired = expireOnce ?? false;
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    const body = init?.body ? (JSON.parse(String(init.body)) as { role?: RoleCode }) : {};
    const auth = (init?.headers as Record<string, string>)['authorization'];
    if (path === '/auth/telegram') {
      calls.push(`telegram:${body.role ?? '-'}`);
      return exchange(roles, body.role);
    }
    if (path !== '/auth/me' || !roles) return json(404, { code: 'NOT_FOUND' });
    calls.push(`me:${auth}`);
    if (expired) {
      expired = false;
      return json(401, { code: 'UNAUTHORIZED' });
    }
    const active = auth?.replace('Bearer t-', '') as RoleCode;
    return json(200, { ...profile(roles, active), permissions: [] });
  });
  return calls;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Mini App qobig‘i (T-009)', () => {
  it("C-03: eski klient (requestContact yo'q) — MainButton «Botga qaytish» ilovani yopadi", async () => {
    fakeApi({ roles: null });
    const wa = appWebApp({ version: '6.1' });
    render(<App webApp={wa} />);
    await screen.findByText(t.onboarding.oldClient);
    // MainButton — passive effect'da (render'dan keyin): kutiladi.
    await waitFor(() =>
      expect(wa.MainButton.params).toMatchObject({
        text: t.onboarding.backToBot,
        is_visible: true,
      }),
    );
    act(() => wa.MainButton.click());
    expect(wa.closed).toBe(true);
  });

  it('C-02 → bosh sahifa → C-04 rol almashtirish (eslab qolinadi, BackButton)', async () => {
    const calls = fakeApi({ roles: ['teacher', 'guardian'] });
    const wa = appWebApp();
    render(<App webApp={wa} />);
    await userEvent.click(await screen.findByRole('button', { name: t.roles.teacher }));
    await screen.findByText(t.home.greeting.replace('{name}', 'Ali Valiyev'));
    expect(wa.storage.get('lg_role')).toBe('teacher');
    await waitFor(() => expect(wa.SettingsButton.visible).toBe(true));
    expect(wa.BackButton.visible).toBe(false);

    act(() => wa.SettingsButton.click());
    await screen.findByText(t.settings.title);
    await waitFor(() => expect(wa.BackButton.visible).toBe(true));
    await userEvent.click(screen.getByRole('button', { name: t.roles.guardian }));
    await screen.findByText(t.home.greeting.replace('{name}', 'Ali Valiyev'));
    expect(wa.storage.get('lg_role')).toBe('guardian');
    expect(calls).toContain('me:Bearer t-guardian');
    expect(wa.haptics).toContain('success');
  });

  it('deep link begona rol uchun (apr_ — faqat Direktor) — «Ruxsat yoʻq»', async () => {
    fakeApi({ roles: ['teacher'] });
    const wa = appWebApp({ startParam: 'apr_3f1c2a9e' });
    render(<App webApp={wa} />);
    await screen.findByText(t.states.forbiddenTitle);
    await userEvent.click(screen.getByRole('button', { name: t.states.forbiddenAction }));
    await screen.findByText(t.home.greeting.replace('{name}', 'Ali Valiyev'));
  });

  it("token eskirdi — initData faol rol bilan qayta almashtiriladi, so'rov takrorlanadi", async () => {
    const calls = fakeApi({ roles: ['teacher', 'guardian'], expireOnce: true });
    const wa = appWebApp();
    wa.storage.set('lg_role', 'guardian');
    render(<App webApp={wa} />);
    await screen.findByText(t.home.greeting.replace('{name}', 'Ali Valiyev'));
    expect(calls).toEqual([
      'telegram:guardian',
      'me:Bearer t-guardian',
      'telegram:guardian',
      'me:Bearer t-guardian',
    ]);
  });
});
