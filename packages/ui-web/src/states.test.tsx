import { webMessages } from '@lg/i18n';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button.js';
import { Field } from './field.js';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from './states.js';

describe('ui-web: holatlar va asosiy komponentlar', () => {
  it('EmptyState — sarlavha va hint', () => {
    render(<EmptyState title="Bo'sh" hint="Ma'lumot yo'q" />);
    expect(screen.getByText("Bo'sh")).toBeTruthy();
    expect(screen.getByText("Ma'lumot yo'q")).toBeTruthy();
  });
  it('ErrorState — matn, qayta urinish, requestId', () => {
    const retry = vi.fn();
    render(<ErrorState message="Xato" requestId="req-1" onRetry={retry} />);
    fireEvent.click(screen.getByRole('button', { name: webMessages.states.retry }));
    expect(retry).toHaveBeenCalledOnce();
    expect(screen.getByText('req-1')).toBeTruthy();
  });

  it('LoadingState — status roli, ForbiddenState — sarlavha', () => {
    render(<LoadingState />);
    expect(screen.getByRole('status')).toBeTruthy();
    render(<ForbiddenState />);
    expect(screen.getByText(webMessages.states.forbiddenTitle)).toBeTruthy();
  });

  it("Button loading — bosib bo'lmaydi (takroriy yuborishdan himoya)", () => {
    const click = vi.fn();
    render(
      <Button loading onClick={click}>
        Saqlash
      </Button>,
    );
    const btn = screen.getByRole('button', { name: 'Saqlash' });
    expect(btn).toHaveProperty('disabled', true);
    expect(btn.getAttribute('aria-busy')).toBe('true');
  });

  it("Field xato — aria-invalid va bog'langan xato matni", () => {
    render(<Field label="Telefon" error="Noto'g'ri" />);
    const input = screen.getByLabelText('Telefon');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe("Noto'g'ri");
  });
});
