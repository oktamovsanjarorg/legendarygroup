import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ImageViewer } from './image-viewer.js';

afterEach(cleanup);

describe('ImageViewer (MS-02)', () => {
  it('dastlab rasm yuklanmoqda holatida boʻladi', () => {
    render(
      <ImageViewer
        src="/receipt.jpg"
        alt="Chek rasmi"
        hint="Kattalashtirish"
        errorLabel="Rasm yuklanmadi"
      />,
    );

    const img = screen.getByAltText('Chek rasmi');
    expect(img).toBeTruthy();
    expect(img.className).toContain('invisible');
  });

  it('xatolik (onError) yuz berganda xato matni chiqadi', () => {
    render(
      <ImageViewer
        src="/broken-image.jpg"
        alt="Buzuq rasm"
        hint="Kattalashtirish"
        errorLabel="Rasm yuklanmadi"
      />,
    );

    const img = screen.getByAltText('Buzuq rasm');
    fireEvent.error(img);

    expect(screen.getByText('Rasm yuklanmadi')).toBeTruthy();
    expect(screen.queryByAltText('Buzuq rasm')).toBeNull();
  });

  it('yuklanganda (onLoad) tayyor holatga oʻtadi va bosilganda toʻliq ekran ochiladi', () => {
    render(
      <ImageViewer
        src="/receipt.jpg"
        alt="Toʻlov cheki"
        hint="Kattalashtirish uchun bosing"
        errorLabel="Rasm yuklanmadi"
      />,
    );

    const img = screen.getByAltText('Toʻlov cheki');
    fireEvent.load(img);

    expect(screen.getByText('Kattalashtirish uchun bosing')).toBeTruthy();
    expect(img.className).not.toContain('invisible');

    // Toʻliq ekranni ochish
    fireEvent.click(screen.getByRole('button'));
    const modal = screen.getByRole('dialog', { name: 'Toʻlov cheki' });
    expect(modal).toBeTruthy();

    // Dialog bosilsa yopiladi
    fireEvent.click(modal);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
