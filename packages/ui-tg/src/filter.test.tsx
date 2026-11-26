import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { BookOpen } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FilterBar, FilterSelect, FilterToggle } from './filter.js';

afterEach(cleanup);

describe('Filtrlar (T-178)', () => {
  it('select: tanlanganda qiymat; sukutdan farqli — ajralib turadi', () => {
    const onChange = vi.fn();
    const opts = [
      { value: 'all', label: 'Barcha fanlar' },
      { value: 'c1', label: 'Matematika' },
    ];
    const { rerender } = render(
      <FilterBar label="Filtrlar">
        <FilterSelect
          label="Fan"
          icon={BookOpen}
          value="all"
          defaultValue="all"
          options={opts}
          onChange={onChange}
        />
      </FilterBar>,
    );
    const sel = screen.getByLabelText('Fan');
    expect(sel.closest('label')?.className).not.toContain('bg-primary/10');
    expect(sel.closest('label')?.textContent).toContain('Barcha fanlar');
    fireEvent.change(sel, { target: { value: 'c1' } });
    expect(onChange).toHaveBeenCalledWith('c1');
    rerender(
      <FilterSelect
        label="Fan"
        icon={BookOpen}
        value="c1"
        defaultValue="all"
        options={opts}
        onChange={onChange}
      />,
    );
    expect(screen.getByLabelText('Fan').closest('label')?.className).toContain('bg-primary/10');
    expect(screen.getByLabelText('Fan').closest('label')?.textContent).toContain('Matematika');
  });

  it('toggle: bosilsa teskari qiymat', () => {
    const onChange = vi.fn();
    render(<FilterToggle label="Arxiv" on={false} onChange={onChange} />);
    const b = screen.getByRole('button', { name: 'Arxiv' });
    expect(b.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(b);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
