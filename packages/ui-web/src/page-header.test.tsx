import { webMessages as t } from '@lg/i18n';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { PageHeader } from './page-header.js';

afterEach(cleanup);

describe('PageHeader', () => {
  it('sarlavha va izohni koʻrsatadi', () => {
    render(<PageHeader title="Kassa" description="Bugungi hisob" />);
    expect(screen.getByRole('heading', { level: 1, name: 'Kassa' })).toBeDefined();
    expect(screen.getByText('Bugungi hisob')).toBeDefined();
    expect(screen.queryByLabelText(t.help.open)).toBeNull();
  });

  it('help parametri berilganda «?» havolasini chiqaradi', () => {
    render(<PageHeader title="Kunlik kassa" help="kassa-yopish" />);
    const link = screen.getByLabelText(t.help.open);
    expect(link).toBeDefined();
    expect(link.getAttribute('href')).toBe('/help#kassa-yopish');
  });

  it('help toʻliq yoʻl boʻlsa ham toʻgʻri havola qiladi', () => {
    render(<PageHeader title="Toʻlovlar" help="/help#tolov-kiritish" />);
    const link = screen.getByLabelText(t.help.open);
    expect(link.getAttribute('href')).toBe('/help#tolov-kiritish');
  });
});
