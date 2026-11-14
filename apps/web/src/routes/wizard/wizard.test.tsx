import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WizardPage } from './index.js';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

describe('W-33: Birinchi ishga tushirish ustasi (T-117)', () => {
  beforeEach(() => {
    localStorage.clear();
    mockNavigate.mockReset();
  });

  afterEach(cleanup);

  it('boshlangʻich 0-qadam toʻgʻri koʻrinadi', () => {
    render(<WizardPage />);

    expect(screen.getByText('Birinchi ishga tushirish')).toBeDefined();
    expect(screen.getByText('1-qadam / 8')).toBeDefined();
    expect(screen.getByLabelText('Markaz nomi')).toBeDefined();
  });

  it('Davom etish bosilganda 2-qadamga (Rekvizitlar) oʻtadi va progress saqlanadi', () => {
    render(<WizardPage />);

    const nextBtn = screen.getByRole('button', { name: 'Davom etish' });
    fireEvent.click(nextBtn);

    expect(screen.getByText('2-qadam / 8')).toBeDefined();
    expect(localStorage.getItem('lg_wizard_step')).toBe('1');
    expect(screen.getByLabelText('Karta raqami (rekvizit)')).toBeDefined();
  });

  it('Keyinroq (skip) bosilganda ham keyingi qadamga oʻtadi', () => {
    render(<WizardPage />);

    const skipBtn = screen.getByRole('button', { name: 'Keyinroq' });
    fireEvent.click(skipBtn);

    expect(screen.getByText('2-qadam / 8')).toBeDefined();
  });

  it('Orqaga bosilganda avvalgi qadamga qaytadi', () => {
    localStorage.setItem('lg_wizard_step', '2');
    render(<WizardPage />);

    expect(screen.getByText('3-qadam / 8')).toBeDefined();
    const backBtn = screen.getByRole('button', { name: 'Orqaga' });
    fireEvent.click(backBtn);

    expect(screen.getByText('2-qadam / 8')).toBeDefined();
  });

  it('soʻnggi 8-qadamda Tizimga oʻtish bosilganda bosh sahifaga yoʻnaltiradi', () => {
    localStorage.setItem('lg_wizard_step', '7');
    render(<WizardPage />);

    expect(screen.getByText('8-qadam / 8')).toBeDefined();
    const finishBtn = screen.getByRole('button', { name: 'Tizimga oʻtish' });
    fireEvent.click(finishBtn);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/' });
    expect(localStorage.getItem('lg_wizard_step')).toBeNull();
  });
});
