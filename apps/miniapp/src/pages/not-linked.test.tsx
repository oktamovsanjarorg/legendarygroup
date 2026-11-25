import { appWebApp } from '../test-webapp.js';
import { miniappMessages as t } from '@lg/i18n';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../app.js';

const c = t.onboarding;
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const user = (role: string) => ({
  id: 'u1',
  fullName: 'Ali Valiyev',
  phone: '+998901112233',
  roles: [role],
  activeRole: role,
});

/** Soxta API: `onboard` — bog'lash javobi; bog'langach `/auth/telegram` kiradi. */
function fakeApi(onboard: Record<string, unknown>, role = 'guardian') {
  let linked = false;
  const calls: { path: string; body: Record<string, unknown> }[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '');
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    calls.push({ path, body });
    if (path === '/auth/telegram')
      return linked
        ? json(200, { next: 'done', accessToken: 't', user: user(role) })
        : json(401, { code: 'TELEGRAM_NOT_LINKED', message: 'x' });
    if (path === '/auth/me') return json(200, { ...user(role), permissions: [] });
    if (path === '/auth/telegram/contact' || path === '/auth/telegram/student') {
      const key = path.endsWith('student')
        ? 'student'
        : body['createRequest']
          ? 'request'
          : 'contact';
      const result = onboard[key];
      if (result === 'linked') linked = true;
      return json(200, { result });
    }
    return json(404, { code: 'NOT_FOUND' });
  });
  return calls;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const main = (wa: ReturnType<typeof appWebApp>, text: string) =>
  waitFor(() => expect(wa.MainButton.params).toMatchObject({ text, is_visible: true }));

describe('C-03 Xush kelibsiz — Mini App ichida kirish (Q-111)', () => {
  it('«bogʻlanmagan» yozuvi yoʻq; raqam ulashiladi → server bogʻlaydi → ilova ochiladi', async () => {
    const calls = fakeApi({ contact: 'linked' });
    const wa = appWebApp();
    render(<App webApp={wa} />);
    expect(await screen.findByText(c.title)).toBeTruthy();
    expect(screen.queryByText(/bogʻlanmagan/i)).toBeNull();
    await main(wa, c.share);
    act(() => wa.MainButton.click());
    await waitFor(() => expect(screen.queryByText(c.title)).toBeNull());
    const sent = calls.find((x) => x.path === '/auth/telegram/contact');
    expect(sent?.body).toMatchObject({ contact: wa.contactResponse, createRequest: false });
    expect(wa.closed).toBe(false);
  });

  it('nomaʼlum raqam → «Men ota-onaman» soʻrovi → kutish ekrani', async () => {
    fakeApi({ contact: 'not_found', request: 'request_created' });
    const wa = appWebApp();
    render(<App webApp={wa} />);
    await main(wa, c.share);
    act(() => wa.MainButton.click());
    expect(await screen.findByText(c.unknownTitle)).toBeTruthy();
    await main(wa, c.request);
    act(() => wa.MainButton.click());
    expect(await screen.findByText(c.requestedTitle)).toBeTruthy();
    await main(wa, c.refresh);
    act(() => wa.MainButton.click());
    expect(await screen.findByText(c.notYet)).toBeTruthy();
  });

  it('oʻquvchi: kod Mini App ichida; notoʻgʻri — xabar, toʻgʻri — kiradi', async () => {
    let result = 'invalid';
    const onboard = {
      get student() {
        return result;
      },
    };
    fakeApi(onboard, 'student');
    const wa = appWebApp();
    render(<App webApp={wa} />);
    fireEvent.click(await screen.findByRole('button', { name: c.student }));
    fireEvent.change(screen.getByLabelText(c.code), { target: { value: '12a3456' } });
    await main(wa, c.enter);
    act(() => wa.MainButton.click());
    expect(await screen.findByText(c.codeInvalid)).toBeTruthy();
    result = 'linked';
    act(() => wa.MainButton.click());
    await waitFor(() => expect(screen.queryByText(c.studentTitle)).toBeNull());
  });

  it('raqamni ulashmasa — tushuntirish, qayta soʻraydi', async () => {
    fakeApi({});
    const wa = appWebApp();
    wa.contactAnswer = false;
    render(<App webApp={wa} />);
    await main(wa, c.share);
    act(() => wa.MainButton.click());
    expect(await screen.findByText(c.declined)).toBeTruthy();
  });
});
