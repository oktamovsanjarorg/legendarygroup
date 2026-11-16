import { ROLE_PERMISSIONS } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { cleanup, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeApi, renderApp } from '../../test/app.js';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('W-36 «Yordam» ekrani (T-123)', () => {
  it('Direktor uchun barcha 11 boʻlim va savollar ochiladi', async () => {
    fakeApi(ROLE_PERMISSIONS.director, () => undefined);
    renderApp('/help');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: t.help.title })).toBeDefined();
    });

    expect(screen.getByRole('heading', { level: 2, name: 'Kirish' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Ustozlar oyligi' })).toBeDefined();
    expect(screen.getByText('Kassani qanday yopaman?')).toBeDefined();
  });

  it("qidiruv «o'qituvchi» va «oʻqituvchi» bilan bir xil natija beradi", async () => {
    const user = userEvent.setup();
    fakeApi(ROLE_PERMISSIONS.director, () => undefined);
    renderApp('/help');

    await waitFor(() => {
      expect(screen.getByRole('searchbox')).toBeDefined();
    });

    const searchInput = screen.getByRole('searchbox');

    // 1. ASCII apostrof bilan qidirish
    await user.clear(searchInput);
    await user.type(searchInput, "o'qituvchi");

    expect(
      screen.getByText('Administrator yoki oʻqituvchi (ustoz) qanday qoʻshaman?'),
    ).toBeDefined();

    // 2. Rasmiy oʻzbek lotin apostrofi (U+02BB) bilan qidirish
    await user.clear(searchInput);
    await user.type(searchInput, 'oʻqituvchi');

    expect(
      screen.getByText('Administrator yoki oʻqituvchi (ustoz) qanday qoʻshaman?'),
    ).toBeDefined();
  });

  it('Adminʼda «oylik» boʻlimi yoʻq (payroll.manage ruxsati yoʻqligi sababli)', async () => {
    fakeApi(ROLE_PERMISSIONS.admin, () => undefined);
    renderApp('/help');

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: t.help.title })).toBeDefined();
    });

    // Adminʼda ruxsati bor boʻlimlar koʻrinadi
    expect(screen.getByRole('heading', { level: 2, name: 'Kirish' })).toBeDefined();
    expect(screen.getByRole('heading', { level: 2, name: 'Toʻlovlar' })).toBeDefined();

    // Adminʼda oylik boʻlimi umuman yoʻq (na sarlavha, na chip)
    expect(screen.queryByRole('heading', { level: 2, name: 'Ustozlar oyligi' })).toBeNull();
    expect(screen.queryByRole('tab', { name: 'Ustozlar oyligi' })).toBeNull();
    expect(
      screen.queryByText('Oʻqituvchilar (ustozlar) oyligi qanday hisoblanadi va toʻlanadi?'),
    ).toBeNull();
  });

  it('/help#kassa-yopish — toʻgʻridan-toʻgʻri oʻsha savol kartasini koʻrsatadi', async () => {
    fakeApi(ROLE_PERMISSIONS.director, () => undefined);
    window.location.hash = '#kassa-yopish';
    renderApp('/help#kassa-yopish');

    await waitFor(() => {
      const card = document.getElementById('kassa-yopish');
      expect(card).not.toBeNull();
      expect(card?.textContent).toContain('Kassani qanday yopaman?');
    });
  });

  it('qidiruvda natija topilmasa EmptyState chiqadi', async () => {
    const user = userEvent.setup();
    fakeApi(ROLE_PERMISSIONS.director, () => undefined);
    renderApp('/help');

    await waitFor(() => {
      expect(screen.getByRole('searchbox')).toBeDefined();
    });

    const searchInput = screen.getByRole('searchbox');
    await user.type(searchInput, 'mavjud_bolmagan_soz_987654');

    expect(screen.getByText(t.help.emptyTitle)).toBeDefined();
    expect(screen.getByText(t.help.emptyHint)).toBeDefined();
  });
});
