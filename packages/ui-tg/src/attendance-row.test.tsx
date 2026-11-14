import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AttendanceRow } from './attendance-row.js';

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const setup = () => {
  const onToggle = vi.fn();
  const onMore = vi.fn();
  render(
    <AttendanceRow name="Ali" mark={{ kind: 'present' }} onToggle={onToggle} onMore={onMore} />,
  );
  return { onToggle, onMore, row: screen.getByRole('button', { name: 'Ali: Keldi' }) };
};

describe('AttendanceRow (MT-02, FR-ATT-1/2)', () => {
  it('qisqa teginish — holat almashadi, menyu ochilmaydi', () => {
    const { onToggle, onMore, row } = setup();
    fireEvent.pointerDown(row);
    fireEvent.pointerUp(row);
    fireEvent.click(row);
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onMore).not.toHaveBeenCalled();
  });

  it('uzoq bosish — menyu; keyingi click holatni almashtirmaydi', () => {
    const { onToggle, onMore, row } = setup();
    fireEvent.pointerDown(row);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.pointerUp(row);
    fireEvent.click(row);
    expect(onMore).toHaveBeenCalledOnce();
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('kech qolish — daqiqa bilan, ekran oʻquvchi uchun nom + holat', () => {
    render(
      <AttendanceRow
        name="Vali"
        mark={{ kind: 'late', minutes: 15 }}
        preExcused
        onToggle={vi.fn()}
        onMore={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: 'Vali: 15 daq kech' })).toBeTruthy();
    expect(screen.getByText('Ota-ona oldindan xabar bergan')).toBeTruthy();
  });
});
