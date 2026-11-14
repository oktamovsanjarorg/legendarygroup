import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CopyField } from './copy-field.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('CopyField (MG-06)', () => {
  it('qiymat va izohni chizadi, dastlab nusxalash yorligʻi koʻrinadi', () => {
    render(
      <CopyField
        value="8600 1234 5678 9012"
        caption="Rasmiy karta"
        copyLabel="Nusxalash"
        copiedLabel="Nusxalandi"
      />,
    );

    expect(screen.getByText('8600 1234 5678 9012')).toBeTruthy();
    expect(screen.getByText('Rasmiy karta')).toBeTruthy();
    expect(screen.getByText('Nusxalash')).toBeTruthy();
  });

  it('bosilganda copy propi orqali boʻshliqsiz nusxa olinadi va "Nusxalandi" chiqadi', async () => {
    const copy = vi.fn().mockResolvedValue(undefined);
    const onCopied = vi.fn();

    render(
      <CopyField
        value="8600 1234 5678 9012"
        copyLabel="Nusxalash"
        copiedLabel="Nusxalandi"
        copy={copy}
        onCopied={onCopied}
      />,
    );

    const btn = screen.getByRole('button');
    await act(async () => {
      fireEvent.click(btn);
    });

    expect(copy).toHaveBeenCalledWith('8600123456789012');
    expect(onCopied).toHaveBeenCalledOnce();
    expect(screen.getByText('Nusxalandi')).toBeTruthy();

    // 2 soniyadan soʻng asl holatga qaytadi
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(screen.getByText('Nusxalash')).toBeTruthy();
  });
});
