import { appWebApp } from './test-webapp.js';
import { miniappMessages as t } from '@lg/i18n';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from './app.js';
import { CLOCK, setupApi } from './teacher-flow-helpers.test-util.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Ustoz MT-10 e‘lon va yordamchi ustoz cheklovlari (T-305, Q-62)', () => {
  it('3) e‘lon → tasdiq → POST /announcements 1 marta', async () => {
    const calls = setupApi({});
    const wa = appWebApp();
    render(<App webApp={wa} clock={CLOCK} />);

    await userEvent.click(await screen.findByRole('button', { name: t.tabs.groups }));
    await userEvent.click(await screen.findByText('IELTS B2'));
    await userEvent.click(await screen.findByText(t.groups.announce));

    await screen.findByText(t.announce.title);
    const textarea = screen.getByPlaceholderText(t.announce.placeholder);
    await userEvent.type(textarea, 'Ertaga dars 15:00 da boshlanadi.');

    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(true));
    act(() => wa.MainButton.click());

    const confirmBtn = await screen.findByRole('button', { name: t.announce.confirm });
    await userEvent.click(confirmBtn);

    await waitFor(() =>
      expect(calls.filter((c) => c.method === 'POST' && c.path === '/announcements')).toHaveLength(
        1,
      ),
    );
    const announceCall = calls.find((c) => c.method === 'POST' && c.path === '/announcements');
    expect(announceCall?.body).toMatchObject({
      title: 'IELTS B2 guruhi eʼloni',
      body: 'Ertaga dars 15:00 da boshlanadi.',
      targetType: 'group',
      targetId: 'g1',
      sendNow: true,
    });
  });

  it('4) yordamchi ustozda tugmalar yo‘qligi testi (Q-62)', async () => {
    setupApi({ isAssistant: true });
    const wa = appWebApp();
    render(<App webApp={wa} clock={CLOCK} />);

    await userEvent.click(await screen.findByRole('button', { name: t.tabs.groups }));
    await userEvent.click(await screen.findByText('IELTS B2'));

    expect(screen.queryByText(t.groups.announce)).toBeNull();

    await userEvent.click(screen.getByText(t.groups.tests));
    expect(await screen.findByText(t.tests.emptyHintAssistant)).toBeTruthy();
    await waitFor(() => expect(wa.MainButton.params.is_visible).toBe(false));
  });
});
