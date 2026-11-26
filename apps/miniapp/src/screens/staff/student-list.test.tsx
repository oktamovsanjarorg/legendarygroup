import { miniappMessages as t } from '@lg/i18n';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_FILTERS, studentListUrl } from '../../data/staff-students.js';
import { type StudentListViewProps, StudentListView } from './student-list.js';

afterEach(cleanup);
const c = t.students;
const C1 = '11111111-1111-4111-8111-111111111111';

const view = (over: Partial<StudentListViewProps> = {}) => {
  const p: StudentListViewProps = {
    filters: DEFAULT_FILTERS,
    courses: [{ id: C1, name: 'Robototexnika' }],
    items: [
      {
        id: 's1',
        code: 'LG-10001',
        name: 'Ali Valiyev',
        phone: '',
        groups: ['Robo 1'],
        debt: 650_000n,
      },
    ],
    loading: false,
    hasMore: true,
    loadingMore: false,
    onFilters: vi.fn(),
    onMore: vi.fn(),
    onOpen: vi.fn(),
    ...over,
  };
  render(<StudentListView {...p} />);
  return p;
};

describe('MS-04 Oʻquvchilar roʻyxati (T-177)', () => {
  it('soʻrov: tartib, holat, fan; qidiruv faqat 2+ belgida; cursor', () => {
    expect(studentListUrl(DEFAULT_FILTERS, null)).toBe(
      '/students?limit=20&sort=name&status=active',
    );
    const url = studentListUrl({ q: 'Ali', courseId: C1, sort: 'code', status: 'archived' }, 'abc');
    expect(url).toBe(
      `/students?limit=20&sort=code&status=archived&q=Ali&courseId=${C1}&cursor=abc`,
    );
    expect(studentListUrl({ ...DEFAULT_FILTERS, q: 'A' }, null)).not.toContain('q=');
  });

  it('fan, tartib va arxiv filtrlari; «Yana koʻrsatish» — keyingi sahifa; bosilsa — ochiladi', () => {
    const p = view();
    fireEvent.change(screen.getByLabelText(c.course), { target: { value: C1 } });
    expect(p.onFilters).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, courseId: C1 });
    fireEvent.change(screen.getByLabelText(c.sort), { target: { value: 'newest' } });
    expect(p.onFilters).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, sort: 'newest' });
    fireEvent.click(screen.getByRole('button', { name: c.archived }));
    expect(p.onFilters).toHaveBeenCalledWith({ ...DEFAULT_FILTERS, status: 'archived' });
    fireEvent.click(screen.getByRole('button', { name: c.more }));
    expect(p.onMore).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByText('Ali Valiyev'));
    expect(p.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 's1' }));
  });

  it('fan tanlangan boʻlsa — «Barcha fanlar» qaytaradi', () => {
    const p = view({ filters: { ...DEFAULT_FILTERS, courseId: C1 } });
    fireEvent.change(screen.getByLabelText(c.course), { target: { value: 'all' } });
    expect(p.onFilters).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });

  it('boʻsh: filtr boʻyicha — «Oʻquvchi yoʻq»; qidiruvda — «topilmadi»', () => {
    view({ items: [], hasMore: false });
    expect(screen.getByText(c.empty)).toBeTruthy();
    cleanup();
    view({ items: [], hasMore: false, filters: { ...DEFAULT_FILTERS, q: 'Zzz' } });
    expect(screen.getByText(t.search.notFound)).toBeTruthy();
  });
});
