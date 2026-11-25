import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Command, CommandPalette, filterCommands } from './command-palette.js';

afterEach(cleanup);

const cmd = (label: string, group?: string): Command => ({
  key: label,
  label,
  group,
  run: vi.fn(),
});

describe('CommandPalette (T-174)', () => {
  it('qidiruv: harf va tutuq belgisi farqsiz, guruh nomi boʻyicha ham', () => {
    const list = [cmd('Toʻlov kiritish', 'Pul'), cmd('Qarzdorlar', 'Pul'), cmd('Guruhlar')];
    expect(filterCommands(list, "to'lov").map((c) => c.label)).toEqual(['Toʻlov kiritish']);
    expect(filterCommands(list, 'PUL')).toHaveLength(2);
    expect(filterCommands(list, '')).toHaveLength(3);
  });

  it('↓ Enter — tanlangan bajariladi va oyna yopiladi; Esc — yopiladi', () => {
    const a = cmd('Bugun');
    const b = cmd('Qarzdorlar');
    const onClose = vi.fn();
    render(
      <CommandPalette
        open
        onClose={onClose}
        commands={[a, b]}
        placeholder="Qidirish"
        empty="Topilmadi"
        closeLabel="Yopish"
      />,
    );
    const input = screen.getByPlaceholderText('Qidirish');
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(b.run).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('tartib: topilgan oʻquvchilar → boʻlimlar → yordamchidan soʻrash; boʻsh — matn', () => {
    const ask = cmd('Yordamchidan soʻrash');
    render(
      <CommandPalette
        open
        onClose={vi.fn()}
        commands={[cmd('Alimov guruhi')]}
        dynamic={(q) =>
          q === 'yoq' ? { before: [], after: [] } : { before: [cmd('Ali Valiyev')], after: [ask] }
        }
        placeholder="Qidirish"
        empty="Topilmadi"
        closeLabel="Yopish"
      />,
    );
    const input = screen.getByPlaceholderText('Qidirish');
    fireEvent.change(input, { target: { value: 'Ali' } });
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Ali Valiyev',
      'Alimov guruhi',
      'Yordamchidan soʻrash',
    ]);
    fireEvent.change(input, { target: { value: 'yoq' } });
    expect(screen.getByText('Topilmadi')).toBeTruthy();
  });
});
