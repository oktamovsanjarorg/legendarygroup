import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LandingPage } from './index.js';

const mockNavigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockRequest = vi.fn();
vi.mock('../../api/client.js', () => ({
  api: {
    request: (...args: unknown[]) => mockRequest(...args),
  },
}));

describe('W-35 Landing sahifasi (T-503)', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({ accepted: true });
  });

  afterEach(cleanup);

  it('kurslar, sarlavha va afzalliklar koʻrinadi', () => {
    render(<LandingPage />);

    expect(screen.getAllByText('Legendary Group').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Chuqurlashtirilgan matematika').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS va akademik ingliz tili').length).toBeGreaterThan(0);
  });

  it('Kirish tugmasi bosilganda /login sahifasiga yoʻnaltiradi', () => {
    render(<LandingPage />);

    const loginBtn = screen.getByRole('button', { name: /Tizimga kirish/i });
    fireEvent.click(loginBtn);

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/login' });
  });

  it('Lid formasi toʻldirilib yuborilganda POST /api/public/leads chaqiriladi', async () => {
    render(<LandingPage />);

    const nameInput = screen.getByPlaceholderText('F.I.Sh');
    const phoneInput = screen.getByPlaceholderText('+998 90 123 45 67');
    const submitBtn = screen.getByRole('button', { name: /Joy band qilish/i });

    fireEvent.change(nameInput, { target: { value: 'Aziz Aliyev' } });
    fireEvent.change(phoneInput, { target: { value: '+998901234567' } });
    fireEvent.click(submitBtn);

    expect(mockRequest).toHaveBeenCalledWith(
      '/public/leads',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });
});
