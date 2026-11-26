import { useState } from 'react';
import { useCourses } from '../data/staff-org.js';
import { DEFAULT_FILTERS, useStudentList } from '../data/staff-students.js';
import type { StudentHit } from '../screens/staff/search.js';
import { StudentListView } from '../screens/staff/student-list.js';
import { ErrorNotice } from './notice.js';

/**
 * O'quvchilar ro'yxati (T-177, T-178): qidirmasdan ham hammasi ko'rinadi; fan, tartib, arxiv.
 * MS-04 «O'quvchilar» va MS-07 «To'lov kiritish» — bir xil ro'yxat, faqat sarlavha va bosilganda
 * ochiladigan ekran farq qiladi.
 */
export function StudentListScreen(p: { title?: string; onOpen: (s: StudentHit) => void }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const list = useStudentList(filters);
  const courses = useCourses();
  return (
    <>
      <ErrorNotice error={list.error ?? courses.error} />
      <StudentListView
        {...(p.title ? { title: p.title } : {})}
        filters={filters}
        courses={courses.data ?? []}
        items={list.data ?? []}
        loading={list.isPending}
        hasMore={list.hasNextPage}
        loadingMore={list.isFetchingNextPage}
        onFilters={setFilters}
        onMore={() => void list.fetchNextPage()}
        onOpen={p.onOpen}
      />
    </>
  );
}
