import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilePicker } from './file-picker.js';

afterEach(cleanup);

const BASE_PROPS = {
  label: 'Toʻlov cheki',
  pickLabel: 'Chekni tanlash',
  replaceLabel: 'Almashtirish',
  uploadingLabel: 'Yuklanmoqda… {p}%',
  onPick: vi.fn(),
};

describe('FilePicker (MG-06, design-system §3)', () => {
  it('empty holati: tanlash yorligʻi chiqadi, bosilsa onPick chaqiriladi', () => {
    const onPick = vi.fn();
    render(<FilePicker {...BASE_PROPS} onPick={onPick} state={{ kind: 'empty' }} />);

    expect(screen.getByText('Chekni tanlash')).toBeTruthy();
    fireEvent.click(screen.getByRole('button'));
    expect(onPick).toHaveBeenCalledOnce();
  });

  it('uploading holati: progressbar aria-valuenow bilan chiqadi, tugma disabled boʻladi', () => {
    render(
      <FilePicker
        {...BASE_PROPS}
        state={{ kind: 'uploading', name: 'receipt.png', percent: 60 }}
      />,
    );

    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('60');
    expect(screen.getByText('Yuklanmoqda… 60%')).toBeTruthy();

    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
  });

  it('ready holati: fayl nomi va preview rasmi chiqadi, almashtirish mumkin', () => {
    const onPick = vi.fn();
    render(
      <FilePicker
        {...BASE_PROPS}
        onPick={onPick}
        state={{
          kind: 'ready',
          name: 'chek.jpg',
          previewUrl: 'https://example.com/receipt.jpg',
        }}
      />,
    );

    expect(screen.getByText('chek.jpg')).toBeTruthy();
    expect(screen.getByText('Almashtirish')).toBeTruthy();
    expect(screen.getByAltText('chek.jpg')).toHaveProperty(
      'src',
      'https://example.com/receipt.jpg',
    );

    fireEvent.click(screen.getByRole('button'));
    expect(onPick).toHaveBeenCalledOnce();
  });

  it('error holati: xato xabari va almashtirish tugmasi chiqadi', () => {
    const onPick = vi.fn();
    render(
      <FilePicker
        {...BASE_PROPS}
        onPick={onPick}
        state={{ kind: 'error', message: 'Fayl hajmi juda katta' }}
      />,
    );

    expect(screen.getByText('Fayl hajmi juda katta')).toBeTruthy();
    expect(screen.getByText('Almashtirish')).toBeTruthy();

    fireEvent.click(screen.getByRole('button'));
    expect(onPick).toHaveBeenCalledOnce();
  });
});
