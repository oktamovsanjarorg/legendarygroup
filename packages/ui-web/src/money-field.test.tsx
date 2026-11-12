import { NBSP } from '@lg/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MoneyField } from './money-field.js';

afterEach(cleanup);

function Harness({ spy }: { spy: (v: bigint | null) => void }) {
  const [v, setV] = useState<bigint | null>(null);
  return <MoneyField label="Summa" value={v} onChange={(x) => (spy(x), setV(x))} />;
}

describe('MoneyField (CLAUDE.md "Pul")', () => {
  it('raqamlar → bigint, U+00A0 bilan guruhlanadi; harf va 0 — rad', () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const input = screen.getByLabelText('Summa') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '1300000' } });
    expect(spy).toHaveBeenLastCalledWith(1_300_000n);
    expect(input.value).toBe(`1${NBSP}300${NBSP}000`);
    fireEvent.change(input, { target: { value: 'x0' } });
    expect(spy).toHaveBeenLastCalledWith(null);
  });
});
