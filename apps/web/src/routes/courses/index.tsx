import type { Course, Room } from '@lg/contracts';
import { ForbiddenState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { CoursesView, type CoursesTab } from '../../screens/f1/courses.js';
import { CourseDrawer } from './course-drawer.js';
import { RoomDrawer } from './room-drawer.js';
import { useCourses, useGroupCounts, useRooms } from './use-courses.js';

/** `id: null` — yangi yozuv. */
type Panel = { tab: CoursesTab; id: string | null } | null;

function panelView(panel: Panel, courses: Course[], rooms: Room[], close: () => void) {
  if (!panel) return null;
  const key = panel.id ?? 'new';
  return panel.tab === 'courses' ? (
    <CourseDrawer key={key} course={courses.find((c) => c.id === panel.id)} onClose={close} />
  ) : (
    <RoomDrawer key={key} room={rooms.find((r) => r.id === panel.id)} onClose={close} />
  );
}

function CoursesScreen({ canSeeGroups }: { canSeeGroups: boolean }) {
  const [tab, setTab] = useState<CoursesTab>('courses');
  const [archived, setArchived] = useState(false);
  const [panel, setPanel] = useState<Panel>(null);
  const status = archived ? 'archived' : 'active';
  const courses = useCourses(status);
  const rooms = useRooms(status);
  const count = useGroupCounts(canSeeGroups);
  const failed = courses.isError ? courses : rooms.isError ? rooms : null;
  return (
    <>
      <CoursesView
        tab={tab}
        archived={archived}
        loading={courses.isPending || rooms.isPending}
        error={failed ? errorView(failed.error, () => void failed.refetch()) : undefined}
        courses={(courses.data ?? []).map((c) => ({
          id: c.id,
          name: c.name,
          price: BigInt(c.defaultMonthlyPrice),
          months: c.durationMonths,
          groups: count?.(c.id),
          archived: Boolean(c.archivedAt),
        }))}
        rooms={(rooms.data ?? []).map((r) => ({
          id: r.id,
          name: r.name,
          capacity: r.capacity,
          groups: count?.(r.id),
          archived: Boolean(r.archivedAt),
        }))}
        onTab={setTab}
        onArchived={setArchived}
        onAdd={() => setPanel({ tab, id: null })}
        onOpen={(id) => setPanel({ tab, id })}
      />
      {panelView(panel, courses.data ?? [], rooms.data ?? [], () => setPanel(null))}
    </>
  );
}

/** W-09 Kurslar va xonalar (T-102, FR-ORG-1/2): `course.manage`. */
export function CoursesPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('course.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <CoursesScreen canSeeGroups={permissions.has('group.view')} />;
}
