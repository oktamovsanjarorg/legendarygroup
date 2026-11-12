import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { KpiCard } from './kpi-card.js';

afterEach(cleanup);

describe('KpiCard (W-04, FR-DASH-1)', () => {
  it('label va qiymatni chizadi', () => {
    render(<KpiCard label="Oylik tushum" value="78 650 000 soʻm" />);

    expect(screen.getByText('Oylik tushum')).toBeTruthy();
    expect(screen.getByText('78 650 000 soʻm')).toBeTruthy();
  });

  it('delta koʻrsatkichi: good=true boʻlsa text-success, good=false boʻlsa text-danger', () => {
    const { rerender } = render(
      <KpiCard label="Tushum" value="10 000" delta={{ text: '+12%', up: true, good: true }} />,
    );

    const goodDelta = screen.getByText('+12%');
    expect(goodDelta.className).toContain('text-success');

    rerender(
      <KpiCard label="Tushum" value="10 000" delta={{ text: '-5%', up: false, good: false }} />,
    );

    const badDelta = screen.getByText('-5%');
    expect(badDelta.className).toContain('text-danger');
  });

  it('tonlar boʻyicha toʻgʻri rang sinfi qoʻllanadi', () => {
    const { rerender } = render(<KpiCard label="Qarz" value="500 000" tone="danger" />);
    expect(screen.getByText('500 000').className).toContain('text-danger');

    rerender(<KpiCard label="Kutilmoqda" value="3 ta" tone="warning" />);
    expect(screen.getByText('3 ta').className).toContain('text-warning');
  });

  it('onClick berilganda tugma bosiladi, berilmaganda disabled boʻladi', () => {
    const onClick = vi.fn();
    const { rerender } = render(<KpiCard label="Oʻquvchilar" value="186" onClick={onClick} />);

    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(false);
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();

    rerender(<KpiCard label="Oʻquvchilar" value="186" />);
    expect(btn.hasAttribute('disabled')).toBe(true);
  });
});
