import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Drawer } from './drawer.js';

afterEach(cleanup);

describe('Drawer (design-system §4)', () => {
  it('open=false boʻlganda hech narsa chizilmaydi', () => {
    const { container } = render(
      <Drawer open={false} title="Tafsilot" closeLabel="Yopish" onClose={vi.fn()}>
        Kontent
      </Drawer>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('open=true boʻlganda dialog, sarlavha va kontent chiqadi', () => {
    render(
      <Drawer open title="Guruh tafsiloti" closeLabel="Yopish" onClose={vi.fn()}>
        <div>Guruh aʼzolari</div>
      </Drawer>,
    );

    expect(screen.getByRole('dialog', { name: 'Guruh tafsiloti' })).toBeTruthy();
    expect(screen.getByText('Guruh aʼzolari')).toBeTruthy();
  });

  it('yopish tugmasi bosilsa onClose chaqiriladi', () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Tafsilot" closeLabel="Yopish" onClose={onClose}>
        Kontent
      </Drawer>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Yopish' }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Esc klavishi bosilsa onClose chaqiriladi', () => {
    const onClose = vi.fn();
    render(
      <Drawer open title="Tafsilot" closeLabel="Yopish" onClose={onClose}>
        Kontent
      </Drawer>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('fon (backdrop) bosilsa onClose chaqiriladi, lekin ichki qism bosilsa yopilmaydi', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Drawer open title="Tafsilot" closeLabel="Yopish" onClose={onClose}>
        <div data-testid="drawer-inner">Ichki kontent</div>
      </Drawer>,
    );

    // Ichki qism bosilganda yopilmasligi kerak (stopPropagation)
    fireEvent.click(screen.getByTestId('drawer-inner'));
    expect(onClose).not.toHaveBeenCalled();

    // Fon bosilganda yopilishi kerak
    const backdrop = container.firstElementChild;
    if (!backdrop) throw new Error('fon chizilmadi');
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('footer uzatilganda pastki amallar paneli chiziladi', () => {
    render(
      <Drawer
        open
        title="Tafsilot"
        closeLabel="Yopish"
        onClose={vi.fn()}
        footer={<button type="button">Saqlash</button>}
      >
        Kontent
      </Drawer>,
    );

    expect(screen.getByRole('button', { name: 'Saqlash' })).toBeTruthy();
  });
});
