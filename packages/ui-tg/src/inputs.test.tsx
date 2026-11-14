import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Segmented, TextArea } from './inputs.js';

afterEach(cleanup);

describe('Segmented (11-ux §4.8)', () => {
  const options = [
    { value: 'today', label: 'Bugun' },
    { value: 'tomorrow', label: 'Ertaga' },
  ];

  it('radiogroup va variantlarni chizadi, faol elementda aria-checked=true', () => {
    render(<Segmented label="Kun tanlash" value="today" options={options} onChange={vi.fn()} />);

    const group = screen.getByRole('radiogroup', { name: 'Kun tanlash' });
    expect(group).toBeTruthy();

    const todayRadio = screen.getByRole('radio', { name: 'Bugun' });
    const tomorrowRadio = screen.getByRole('radio', { name: 'Ertaga' });

    expect(todayRadio.getAttribute('aria-checked')).toBe('true');
    expect(tomorrowRadio.getAttribute('aria-checked')).toBe('false');
  });

  it('variant bosilsa onChange chaqiriladi', () => {
    const onChange = vi.fn();
    render(<Segmented label="Kun tanlash" value="today" options={options} onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'Ertaga' }));
    expect(onChange).toHaveBeenCalledWith('tomorrow');
  });
});

describe('TextArea (11-ux §4.8)', () => {
  it('yorliq va matn maydonini chizadi', () => {
    render(<TextArea label="Izoh" placeholder="Fikringizni yozing" />);
    expect(screen.getByLabelText('Izoh')).toBeTruthy();
    expect(screen.getByPlaceholderText('Fikringizni yozing')).toBeTruthy();
  });

  it('xato boʻlganda alert chiqadi va aria-invalid belgilanadi', () => {
    render(<TextArea label="Izoh" error="Izoh kiritish majburiy" />);
    const textarea = screen.getByLabelText('Izoh');
    expect(textarea.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('alert').textContent).toBe('Izoh kiritish majburiy');
  });
});
