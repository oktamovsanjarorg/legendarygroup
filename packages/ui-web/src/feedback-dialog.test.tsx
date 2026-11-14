import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FeedbackDialog } from './feedback-dialog.js';

describe('FeedbackDialog (ui-web)', () => {
  it('open false boʻlsa ekranda hech narsa koʻrinmaydi', () => {
    const { container } = render(
      <FeedbackDialog open={false} onClose={vi.fn()} onSubmit={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('open true boʻlsa ochiladi va yuborish ishlaydi', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <FeedbackDialog open={true} onClose={onClose} onSubmit={onSubmit} currentScreen="W-12" />,
    );

    expect(screen.getByText('Fikr yoki xatolik haqida xabar')).toBeDefined();
    expect(screen.getByText('W-12')).toBeDefined();

    const textarea = screen.getByPlaceholderText(
      'Nima yaxshilanishi kerak yoki qanday xatolik yuz berdi?',
    );
    fireEvent.change(textarea, { target: { value: 'Yangi taklifim bor edi' } });

    const submitBtn = screen.getByRole('button', { name: 'Yuborish' });
    expect(submitBtn).toBeDefined();
    fireEvent.click(submitBtn);

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'suggestion',
      text: 'Yangi taklifim bor edi',
    });
  });
});
