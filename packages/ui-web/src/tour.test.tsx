import { webMessages as t } from '@lg/i18n';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Tour } from './tour.js';

const STEPS = [
  { target: '#a', title: 'Birinchi', body: 'A izohi' },
  { target: '#yoq', title: 'Yoʻq', body: 'Bu qadam oʻtkaziladi' },
  { target: '#b', title: 'Ikkinchi', body: 'B izohi' },
];

/** jsdom'da maket yoʻq: element "koʻrinadi" deb hisoblansin. */
beforeEach(() => {
  vi.spyOn(Element.prototype, 'getClientRects').mockReturnValue([{}] as unknown as DOMRectList);
  Element.prototype.scrollIntoView = () => undefined;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const page = (onClose = vi.fn()) => {
  render(
    <>
      <a id="a">A</a>
      <a id="b">B</a>
      <Tour steps={STEPS} onClose={onClose} />
    </>,
  );
  return onClose;
};

describe('Tour (T-124)', () => {
  it('maqsadi yoʻq qadam oʻtkaziladi; Keyingisi / Orqaga / Tushunarli', () => {
    const onClose = page();
    expect(screen.getByRole('dialog', { name: 'Birinchi' })).toBeTruthy();
    expect(screen.getByText('1 / 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.tour.next }));
    expect(screen.getByRole('dialog', { name: 'Ikkinchi' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.tour.back }));
    expect(screen.getByText('1 / 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.tour.next }));
    fireEvent.click(screen.getByRole('button', { name: t.tour.done }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc va «Oʻtkazib yuborish» yopadi; strelkalar bilan yuriladi', () => {
    const onClose = page();
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' })));
    expect(screen.getByText('2 / 2')).toBeTruthy();
    act(() => void document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    fireEvent.click(screen.getByRole('button', { name: t.tour.skip }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('birorta maqsad yoʻq — darhol yopiladi (boʻsh oyna chiqmaydi)', () => {
    const onClose = vi.fn();
    render(<Tour steps={[{ target: '#hech', title: 'X', body: 'Y' }]} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
