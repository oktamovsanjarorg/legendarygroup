import type { StudentSort } from '@lg/contracts';
import { formatMoney, miniappMessages as t } from '@lg/i18n';
import {
  EmptyState,
  FilterBar,
  FilterSelect,
  FilterToggle,
  ListItem,
  SearchField,
  Section,
  StatusChip,
} from '@lg/ui-tg';
import { ArrowDownAZ, BookOpen, Users } from 'lucide-react';
import type { StudentFilters } from '../../data/staff-students.js';
import type { StudentHit } from './search.js';

const c = t.students;
const SORTS: readonly StudentSort[] = ['name', 'code', 'newest'];

export interface StudentListViewProps {
  /** Sarlavha (sukut — «O'quvchilar»; to'lov uchun — «Kimdan to'lov?»). */
  title?: string;
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

const ALL = 'all';

/** Fan, tartib, arxiv — bitta ixcham qator (T-178). */
function Filters(p: Pick<StudentListViewProps, 'filters' | 'courses' | 'onFilters'>) {
  const f = p.filters;
  return (
    <FilterBar label={c.filters}>
      {p.courses.length > 0 && (
        <FilterSelect
          label={c.course}
          icon={BookOpen}
          value={f.courseId ?? ALL}
          defaultValue={ALL}
          options={[
            { value: ALL, label: c.allCourses },
            ...p.courses.map((x) => ({ value: x.id, label: x.name })),
          ]}
          onChange={(v) => p.onFilters({ ...f, courseId: v === ALL ? null : v })}
        />
      )}
      <FilterSelect
        label={c.sort}
        icon={ArrowDownAZ}
        value={f.sort}
        defaultValue="name"
        options={SORTS.map((v) => ({ value: v, label: c.sorts[v] }))}
        onChange={(sort) => p.onFilters({ ...f, sort })}
      />
      <FilterToggle
        label={c.archived}
        on={f.status === 'archived'}
        onChange={(on) => p.onFilters({ ...f, status: on ? 'archived' : 'active' })}
      />
    </FilterBar>
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
      <h1 className="px-2 text-2xl font-bold text-text">{p.title ?? c.title}</h1>
      <SearchField
        value={f.q}
        placeholder={t.search.placeholder}
        clearLabel={t.attendance.cancel}
        onChange={(q) => p.onFilters({ ...f, q })}
      />
      <Filters filters={f} courses={p.courses} onFilters={p.onFilters} />
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
