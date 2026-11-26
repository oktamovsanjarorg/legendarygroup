import type { StudentSort } from '@lg/contracts';
import { formatMoney, miniappMessages as t } from '@lg/i18n';
import { EmptyState, ListItem, SearchField, Section, Segmented, StatusChip } from '@lg/ui-tg';
import { Users } from 'lucide-react';
import type { StudentFilters } from '../../data/staff-students.js';
import type { StudentHit } from './search.js';

const c = t.students;
const SORTS: readonly StudentSort[] = ['name', 'code', 'newest'];

export interface StudentListViewProps {
  filters: StudentFilters;
  courses: readonly { id: string; name: string }[];
  items: readonly StudentHit[];
  loading: boolean;
  hasMore: boolean;
  loadingMore: boolean;
  onFilters: (f: StudentFilters) => void;
  onMore: () => void;
  onOpen: (s: StudentHit) => void;
}

function Chip(p: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={p.on}
      onClick={p.onClick}
      className={`min-h-9 shrink-0 rounded-full px-4 text-sm transition-colors ${
        p.on ? 'bg-primary/15 font-semibold text-primary' : 'bg-bg text-text hover:bg-surface-alt'
      }`}
    >
      {p.label}
    </button>
  );
}

/** Fan (kurs) bo'yicha: gorizontal tugmalar — telefonda suriladi. */
function CourseChips(p: Pick<StudentListViewProps, 'filters' | 'courses' | 'onFilters'>) {
  const set = (courseId: string | null) => p.onFilters({ ...p.filters, courseId });
  if (p.courses.length === 0) return null;
  return (
    <div
      role="radiogroup"
      aria-label={c.course}
      className="-mx-2 flex gap-2 overflow-x-auto px-2 pb-1"
    >
      <Chip on={p.filters.courseId === null} label={c.allCourses} onClick={() => set(null)} />
      {p.courses.map((x) => (
        <Chip
          key={x.id}
          on={p.filters.courseId === x.id}
          label={x.name}
          onClick={() => set(x.id)}
        />
      ))}
    </div>
  );
}

function Rows(p: Pick<StudentListViewProps, 'items' | 'onOpen'>) {
  return (
    <Section>
      {p.items.map((s) => (
        <ListItem
          key={s.id}
          title={s.name}
          subtitle={[s.code, ...s.groups].join(' · ')}
          after={
            s.debt > 0n ? <StatusChip tone="danger">{formatMoney(-s.debt)}</StatusChip> : undefined
          }
          chevron
          onClick={() => p.onOpen(s)}
        />
      ))}
    </Section>
  );
}

/**
 * MS-04 O'quvchilar (T-177): qidiruv + fan, tartib, holat; ro'yxat sahifalab. Qidiruv — ism,
 * telefon yoki ID (oʻ/o' farqsiz, server qoidasi).
 */
export function StudentListView(p: StudentListViewProps) {
  const f = p.filters;
  const empty = !p.loading && p.items.length === 0;
  return (
    <main className="flex flex-col gap-3 p-2 pt-3">
      <h1 className="px-2 text-2xl font-bold text-text">{c.title}</h1>
      <SearchField
        value={f.q}
        placeholder={t.search.placeholder}
        clearLabel={t.attendance.cancel}
        onChange={(q) => p.onFilters({ ...f, q })}
      />
      <CourseChips filters={f} courses={p.courses} onFilters={p.onFilters} />
      <div className="grid grid-cols-2 gap-2 desk:flex desk:justify-between">
        <Segmented
          label={c.sort}
          value={f.sort}
          options={SORTS.map((v) => ({ value: v, label: c.sorts[v] }))}
          onChange={(sort) => p.onFilters({ ...f, sort })}
        />
        <Segmented
          label={c.status}
          value={f.status}
          options={(['active', 'archived'] as const).map((v) => ({
            value: v,
            label: c.statuses[v],
          }))}
          onChange={(status) => p.onFilters({ ...f, status })}
        />
      </div>
      {empty ? (
        <EmptyState
          title={f.q.trim().length >= 2 ? t.search.notFound : c.empty}
          hint={f.q.trim().length >= 2 ? t.search.notFoundHint : c.emptyHint}
          action={<Users className="size-6 text-text-muted" aria-hidden />}
        />
      ) : (
        <Rows items={p.items} onOpen={p.onOpen} />
      )}
      {p.hasMore && (
        <button
          type="button"
          onClick={p.onMore}
          disabled={p.loadingMore}
          className="min-h-11 rounded-xl bg-bg text-sm font-semibold text-link disabled:opacity-50"
        >
          {c.more}
        </button>
      )}
    </main>
  );
}
