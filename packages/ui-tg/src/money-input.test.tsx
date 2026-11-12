import { NBSP } from '@lg/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoneyInput } from './money-input.js';

afterEach(cleanup);

function Harness({ spy }: { spy: (v: bigint | null) => void }) {
  const [v, setV] = useState<bigint | null>(null);
  return (
    <MoneyInput
      label="Summa"
      value={v}
      onChange={(x) => {
        spy(x);
        setV(x);
      }}
    />
  );
}

describe('MoneyInput (CLAUDE.md "Pul": faqat bigint)', () => {
  it("raqamlar bigint'ga, ko'rinishi U+00A0 bilan guruhlanadi", () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const input = screen.getByLabelText('Summa') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1250000' } });
    expect(spy).toHaveBeenLastCalledWith(1_250_000n);
    expect(input.value).toBe(`1${NBSP}250${NBSP}000`);
  });

  it("harf/belgi tashlanadi; 0 yoki bo'sh — null", () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const input = screen.getByLabelText('Summa');
    fireEvent.change(input, { target: { value: '3a5.0,0' } });
    expect(spy).toHaveBeenLastCalledWith(3500n);
    fireEvent.change(input, { target: { value: '0' } });
    expect(spy).toHaveBeenLastCalledWith(null);
    fireEvent.change(input, { target: { value: '' } });
    expect(spy).toHaveBeenLastCalledWith(null);
  });
});
