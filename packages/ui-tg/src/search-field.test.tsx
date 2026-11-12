import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchField } from './search-field.js';

afterEach(cleanup);

describe('SearchField (MS-04)', () => {
  it('placeholder va qidiruv maydoni chiziladi, qiymat boʻsh boʻlsa tozalash tugmasi chiqmaydi', () => {
    render(
      <SearchField
        value=""
        placeholder="Ism boʻyicha qidirish"
        clearLabel="Tozalash"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByPlaceholderText('Ism boʻyicha qidirish')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Tozalash' })).toBeNull();
  });

  it('qiymat kiritilganda onChange chaqiriladi', () => {
    const onChange = vi.fn();
    render(
      <SearchField value="" placeholder="Qidiruv" clearLabel="Tozalash" onChange={onChange} />,
    );

    const input = screen.getByPlaceholderText('Qidiruv');
    fireEvent.change(input, { target: { value: 'Ali' } });
    expect(onChange).toHaveBeenCalledWith('Ali');
  });

  it('qiymat mavjud boʻlganda tozalash tugmasi chiqadi va bosilsa onChange("") chaqiriladi', () => {
    const onChange = vi.fn();
    render(
      <SearchField
        value="Ali Valiyev"
        placeholder="Qidiruv"
        clearLabel="Tozalash"
        onChange={onChange}
      />,
    );

    const clearBtn = screen.getByRole('button', { name: 'Tozalash' });
    expect(clearBtn).toBeTruthy();

    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
