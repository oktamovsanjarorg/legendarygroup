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

describe('Ustoz MT-07 testlar ro‘yxati va yaratish (T-302)', () => {
  it('1) ro‘yxat → test yaratish oqimi', async () => {
    const calls = setupApi({ tests: [] });
    const wa = appWebApp();
    render(<App webApp={wa} clock={CLOCK} />);

    await userEvent.click(await screen.findByRole('button', { name: t.tabs.groups }));
    await userEvent.click(await screen.findByText('IELTS B2'));
    await userEvent.click(await screen.findByText(t.groups.tests));

    expect(await screen.findByText(t.tests.empty)).toBeTruthy();
    await waitFor(() => expect(wa.MainButton.params.is_visible).toBe(true));
    expect(wa.MainButton.params.text).toBe(t.tests.create);

    act(() => wa.MainButton.click());

    // MT-07a forma: nom va maks. ball ustoz kiritadi (maket: "Mock IELTS — Reading · maks. 40 ball").
    await screen.findByText(t.testCreate.title);
    expect(wa.MainButton.params.is_active).toBe(false);
    await userEvent.type(screen.getByLabelText(t.testCreate.name), '  Mock IELTS — Reading ');
    await userEvent.type(screen.getByLabelText(t.testCreate.maxScore), '40');
    await waitFor(() => expect(wa.MainButton.params.is_active).toBe(true));
    act(() => wa.MainButton.click());

    await waitFor(() =>
      expect(calls.some((c) => c.method === 'POST' && c.path === '/tests')).toBe(true),
    );
    const postCall = calls.find((c) => c.method === 'POST' && c.path === '/tests');
    expect(postCall?.body).toMatchObject({
      groupId: 'g1',
      title: 'Mock IELTS — Reading',
      date: '2026-11-16',
      maxScore: 40,
    });
    expect(await screen.findByText(t.testImport.title)).toBeTruthy();
  });

  it('yordamchi ustozda "Test yaratish" tugmasi yoʻq (Q-62)', async () => {
    setupApi({ isAssistant: true, tests: [] });
    const wa = appWebApp();
    render(<App webApp={wa} clock={CLOCK} />);
    await userEvent.click(await screen.findByRole('button', { name: t.tabs.groups }));
    await userEvent.click(await screen.findByText('IELTS B2'));
    await userEvent.click(await screen.findByText(t.groups.tests));
    expect(await screen.findByText(t.tests.emptyHintAssistant)).toBeTruthy();
    expect(wa.MainButton.params.is_visible).toBe(false);
  });
});
