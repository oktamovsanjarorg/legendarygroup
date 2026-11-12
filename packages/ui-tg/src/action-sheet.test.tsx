import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ActionSheet, type SheetAction } from './action-sheet.js';

afterEach(cleanup);

describe('ActionSheet (11-ux §4.5)', () => {
  it('open=false boʻlganda hech narsa chizilmaydi', () => {
    const { container } = render(
      <ActionSheet
        open={false}
        title="Amallar"
        actions={[]}
        cancelLabel="Bekor qilish"
        onClose={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('open=true boʻlganda dialog va amallar chiqadi, amal bosilsa onSelect chaqiriladi', () => {
    const onSelect = vi.fn();
    const actions: SheetAction[] = [{ label: 'Tasdiqlash', onSelect }];

    render(
      <ActionSheet
        open
        title="Amallar menyusi"
        actions={actions}
        cancelLabel="Bekor qilish"
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Amallar menyusi')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it('bekor qilish tugmasi bosilsa onClose chaqiriladi', () => {
    const onClose = vi.fn();
    render(<ActionSheet open actions={[]} cancelLabel="Bekor qilish" onClose={onClose} />);

    fireEvent.click(screen.getByRole('button', { name: 'Bekor qilish' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fon (backdrop) bosilsa onClose chaqiriladi', () => {
    const onClose = vi.fn();
    const { container } = render(
      <ActionSheet open actions={[]} cancelLabel="Bekor qilish" onClose={onClose} />,
    );

    const backdrop = container.firstChild as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('dialog ichi bosilsa onClose chaqirilmaydi (stopPropagation)', () => {
    const onClose = vi.fn();
    render(
      <ActionSheet open title="Mavzu" actions={[]} cancelLabel="Bekor qilish" onClose={onClose}>
        <div data-testid="sheet-content">Kontent</div>
      </ActionSheet>,
    );

    fireEvent.click(screen.getByTestId('sheet-content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('xavfli amal (tone=danger) text-danger klassiga ega boʻladi', () => {
    const actions: SheetAction[] = [{ label: 'Oʻchirish', tone: 'danger', onSelect: vi.fn() }];
    render(<ActionSheet open actions={actions} cancelLabel="Bekor qilish" onClose={vi.fn()} />);

    const btn = screen.getByRole('button', { name: 'Oʻchirish' });
    expect(btn.className).toContain('text-danger');
  });
});
