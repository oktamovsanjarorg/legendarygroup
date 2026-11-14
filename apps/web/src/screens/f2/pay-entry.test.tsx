import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PAY_FILLED, PAY_SAVED, PAY_SEARCH } from './mock.js';
import { type PayEntryProps, PayEntryView } from './pay-entry.js';

afterEach(cleanup);

const props = (s: PayEntryProps['s']) => ({
  s,
  onQuery: vi.fn(),
  onPick: vi.fn(),
  onAmount: vi.fn(),
  onMethod: vi.fn(),
  onSubmit: vi.fn(),
  onNext: vi.fn(),
});

describe('W-13 toʻlov kiritish — sichqonchasiz (11-ux §5: ≤ 30 s)', () => {
  it('Enter — saqlash; tanlanmagan oʻquvchida — yoʻq', () => {
    const p = props(PAY_FILLED);
    render(<PayEntryView {...p} />);
    fireEvent.keyDown(screen.getByLabelText('Summa'), { key: 'Enter' });
    expect(p.onSubmit).toHaveBeenCalledOnce();
    cleanup();
    const q = props(PAY_SEARCH);
    render(<PayEntryView {...q} />);
    fireEvent.keyDown(screen.getByRole('combobox'), { key: 'Enter' });
    expect(q.onSubmit).not.toHaveBeenCalled();
  });

  it('1–4 — usul (maydondan tashqarida); summa maydonida raqam usulni oʻzgartirmaydi', () => {
    const p = props(PAY_FILLED);
    render(<PayEntryView {...p} />);
    fireEvent.keyDown(screen.getByRole('radio', { name: /Oʻtkazma/ }), { key: '3' });
    expect(p.onMethod).toHaveBeenCalledWith('transfer');
    fireEvent.keyDown(screen.getByLabelText('Summa'), { key: '2' });
    expect(p.onMethod).toHaveBeenCalledTimes(1);
  });

  it('saqlangach Esc — keyingi toʻlov; FIFO preview va avans koʻrinadi', () => {
    const p = props(PAY_SAVED);
    render(<PayEntryView {...p} />);
    expect(screen.getByText(/Avans \(balansga\)/)).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('radio', { name: /Naqd/ }), { key: 'Escape' });
    expect(p.onNext).toHaveBeenCalledOnce();
  });
});
