import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SearchField } from './search-field.js';

afterEach(cleanup);

describe('SearchField', () => {
  it('input qiymatini va placeholderʼni chiqaradi', () => {
    render(
      <SearchField value="test" placeholder="Qidiruv" clearLabel="Tozalash" onChange={vi.fn()} />,
    );
    const input = screen.getByRole('searchbox');
    expect(input).toBeDefined();
    expect(input.getAttribute('placeholder')).toBe('Qidiruv');
    expect(input.getAttribute('value')).toBe('test');
  });

  it('matn kiritilganda onChange chaqiriladi', () => {
    const onChange = vi.fn();
    render(
      <SearchField value="" placeholder="Qidiruv" clearLabel="Tozalash" onChange={onChange} />,
    );
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'a' } });
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('qiymat boʻlganda tozalash tugmasi chiqadi va bosilganda boʻshatadi', () => {
    const onChange = vi.fn();
    render(
      <SearchField value="salom" placeholder="Qidiruv" clearLabel="Tozalash" onChange={onChange} />,
    );
    const clearBtn = screen.getByRole('button', { name: 'Tozalash' });
    fireEvent.click(clearBtn);
    expect(onChange).toHaveBeenCalledWith('');
  });
});
