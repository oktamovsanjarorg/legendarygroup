import { appWebApp } from './test-webapp.js';
import { miniappMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const SID = '11111111-1111-4111-8111-111111111111';
const admin = {
  id: 'u1',
  fullName: 'Admin Adminov',
  phone: '+998901112233',
  roles: ['admin'],
  activeRole: 'admin',
};
const c = t.assistant;

function fakeApi(opts: { enabled: boolean; chat?: (body: unknown) => Response; perms?: string[] }) {
  const asked: unknown[] = [];
  const paths: string[] = [];
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const path = String(url).replace('/api', '').split('?')[0] ?? '';
    paths.push(path);
    if (path === '/auth/telegram')
      return json(200, { next: 'done', accessToken: 't', user: admin });
    if (path === '/auth/me')
      return json(200, {
        ...admin,
        permissions: opts.perms ?? ['student.manage', 'student.view', 'payment.create'],
      });
    if (path === '/assistant/status') return json(200, { enabled: opts.enabled });
    if (path === '/assistant/chat') {
      const body = JSON.parse(String(init?.body)) as unknown;
      asked.push(body);
      return opts.chat ? opts.chat(body) : json(500, { code: 'INTERNAL' });
    }
    return json(404, { code: 'NOT_FOUND' });
  });
  return Object.assign(asked, { paths });
}

const openAssistant = async () => {
  fireEvent.click(await screen.findByRole('button', { name: t.stabs.assistant }));
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('MS-35 AI yordamchi (Q-114)', () => {
  it('tez savol → javob va ekran tugmasi → toʻlov ekrani ochiladi', async () => {
    const asked = fakeApi({
      enabled: true,
      chat: () =>
        json(200, {
          reply: 'Ali Valiyev (1042): qarz 650 000 soʻm.',
          actions: [{ screen: 'pay', studentId: SID, label: 'Ali Valiyev' }],
        }),
    });
    render(<App webApp={appWebApp()} />);
    await openAssistant();
    fireEvent.click(await screen.findByRole('button', { name: c.suggestions[0] }));
    expect(await screen.findByText(/qarz 650 000/)).toBeTruthy();
    expect(asked[0]).toEqual({ messages: [{ role: 'user', text: c.suggestions[0] }] });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(c.open.pay) }));
    // To'lov ekrani o'quvchi kartochkasini yuklaydi.
    await waitFor(() => expect(asked.paths).toContain(`/students/${SID}`));
  });

  it('yozib yuborish; xato — matn, savol tarixda qoladi; ikkinchi savolda tarix ketadi', async () => {
    let fail = true;
    const asked = fakeApi({
      enabled: true,
      chat: () =>
        fail
          ? json(502, { code: 'ASSISTANT_UNAVAILABLE' })
          : json(200, { reply: 'Bugun 3 ta chek kutyapti.', actions: [] }),
    });
    render(<App webApp={appWebApp()} />);
    await openAssistant();
    const box = await screen.findByLabelText(c.placeholder);
    fireEvent.change(box, { target: { value: 'Navbatda nechta chek?' } });
    fireEvent.click(screen.getByRole('button', { name: c.send }));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByText('Navbatda nechta chek?')).toBeTruthy();
    fail = false;
    fireEvent.change(box, { target: { value: 'Qayta' } });
    fireEvent.click(screen.getByRole('button', { name: c.send }));
    expect(await screen.findByText('Bugun 3 ta chek kutyapti.')).toBeTruthy();
    expect(asked[1]).toEqual({
      messages: [
        { role: 'user', text: 'Navbatda nechta chek?' },
        { role: 'user', text: 'Qayta' },
      ],
    });
  });

  it('T-175: toʻldirilgan forma — xarajat summasi va izohi tayyor, tekshirish eslatmasi', async () => {
    fakeApi({
      enabled: true,
      perms: ['student.manage', 'student.view', 'expense.manage'],
      chat: () =>
        json(200, {
          reply: 'Ijara 3 000 000 soʻm — formani tekshirib tasdiqlang.',
          actions: [
            {
              screen: 'addExpense',
              prefill: { amount: '3000000', category: 'rent', note: 'Noyabr ijarasi' },
            },
          ],
        }),
    });
    render(<App webApp={appWebApp()} />);
    await openAssistant();
    fireEvent.click(await screen.findByRole('button', { name: c.suggestions[3] }));
    const open = await screen.findByRole('button', { name: new RegExp(c.open.addExpense) });
    expect(open.textContent).toContain(c.prefilled);
    fireEvent.click(open);
    expect(await screen.findByText(c.draftNote)).toBeTruthy();
    expect(screen.getByDisplayValue('Noyabr ijarasi')).toBeTruthy();
    expect(screen.getByDisplayValue(/3\s000\s000/)).toBeTruthy();
  });

  it('kalit sozlanmagan — tushuntirish, yuborish maydoni yoʻq', async () => {
    fakeApi({ enabled: false });
    render(<App webApp={appWebApp()} />);
    await openAssistant();
    expect(await screen.findByText(c.disabledTitle)).toBeTruthy();
    expect(screen.queryByLabelText(c.placeholder)).toBeNull();
  });
});
