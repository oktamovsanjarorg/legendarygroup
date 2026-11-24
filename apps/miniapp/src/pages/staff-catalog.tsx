import type { Course, Room } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { QueryView } from '../data/query-view.js';
import { useStaffCall } from '../data/staff-call.js';
import { courseBody, courseForm, emptyCourse } from '../data/staff-catalog.js';
import { useCourses, useOrgItem, useRooms } from '../data/staff-org.js';
import {
  type CatalogFilter,
  CatalogView,
  CourseFormView,
  courseRows,
  RoomFormView,
  roomRows,
} from '../screens/staff/catalog.js';
import { ErrorNotice } from './notice.js';

const c = t.staffCourses;

/** MS-21 Kurslar (T-150). */
export function StaffCoursesPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CatalogFilter>('active');
  return (
    <QueryView query={useCourses(filter)}>
      {(list) => (
        <CatalogView
          title={c.title}
          empty={c.empty}
          addText={c.add}
          items={courseRows(list)}
          filter={filter}
          onFilter={setFilter}
          onOpen={(id) => void navigate({ to: '/staff/courses/$id', params: { id } })}
          onAdd={() => void navigate({ to: '/staff/courses/new' })}
        />
      )}
    </QueryView>
  );
}

export function StaffRoomsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<CatalogFilter>('active');
  return (
    <QueryView query={useRooms(filter)}>
      {(list) => (
        <CatalogView
          title={c.roomsTitle}
          empty={c.emptyRooms}
          addText={c.addRoom}
          items={roomRows(list)}
          filter={filter}
          onFilter={setFilter}
          onOpen={(id) => void navigate({ to: '/staff/rooms/$id', params: { id } })}
          onAdd={() => void navigate({ to: '/staff/rooms/new' })}
        />
      )}
    </QueryView>
  );
}

/** Saqlash/arxivlash: muvaffaqiyatda ro'yxatga qaytadi. */
function useCatalogSave(kind: 'courses' | 'rooms', id?: string) {
  const navigate = useNavigate();
  const call = useStaffCall();
  const back = () => void navigate({ to: `/staff/${kind}`, replace: true });
  return {
    call,
    save: (body: object) =>
      call.mutate(
        id ? { path: `/${kind}/${id}`, method: 'PATCH', body } : { path: `/${kind}`, body },
        { onSuccess: back },
      ),
    archive: (archived: boolean) =>
      call.mutate(
        { path: `/${kind}/${id}/${archived ? 'restore' : 'archive'}` },
        { onSuccess: back },
      ),
  };
}

function CourseEditor({ course }: { course?: Course }) {
  const { call, save, archive } = useCatalogSave('courses', course?.id);
  const [form, setForm] = useState(() => (course ? courseForm(course) : emptyCourse));
  const archived = Boolean(course?.archivedAt);
  return (
    <>
      <ErrorNotice error={call.error} />
      <CourseFormView
        title={course?.name ?? c.add}
        form={form}
        saving={call.isPending}
        onForm={setForm}
        onSave={() => save(courseBody(form))}
        archived={archived}
        onArchive={course && (() => archive(archived))}
      />
    </>
  );
}

function RoomEditor({ room }: { room?: Room }) {
  const { call, save, archive } = useCatalogSave('rooms', room?.id);
  const archived = Boolean(room?.archivedAt);
  return (
    <>
      <ErrorNotice error={call.error} />
      <RoomFormView
        title={room?.name ?? c.addRoom}
        initial={{ name: room?.name ?? '', capacity: room?.capacity ?? 15 }}
        saving={call.isPending}
        onSave={save}
        archived={archived}
        onArchive={room && (() => archive(archived))}
      />
    </>
  );
}

export const StaffCourseNewPage = () => <CourseEditor />;
export const StaffRoomNewPage = () => <RoomEditor />;

export function StaffCoursePage() {
  const { id } = useParams({ from: '/staff/courses/$id' });
  return (
    <QueryView query={useOrgItem<Course>('courses', id)}>
      {(x) => <CourseEditor course={x} />}
    </QueryView>
  );
}

export function StaffRoomPage() {
  const { id } = useParams({ from: '/staff/rooms/$id' });
  return (
    <QueryView query={useOrgItem<Room>('rooms', id)}>{(x) => <RoomEditor room={x} />}</QueryView>
  );
}
