import type { Meta, StoryObj } from '@storybook/react-vite';
import { lessonActions } from '../../data/staff-calendar.js';
import { courseForm } from '../../data/staff-catalog.js';
import { emptyGroup } from '../../data/staff-groups.js';
import { weekDates } from '../../data/time.js';
import { stateStories } from '../story-kit.js';
import { AttendanceDayView, GroupMonthView } from './attendance.js';
import { CalendarView, LessonView } from './calendar.js';
import { CatalogView, CourseFormView, courseRows, RoomFormView } from './catalog.js';
import { GroupFormView, GroupScheduleView, GroupTeacherView } from './group-forms.js';
import { GroupsView, GroupView } from './groups.js';
import { HolidaysView } from './holidays.js';
import { lesson } from './lists-mock.js';
import {
  ExtraLessonView,
  LessonCancelView,
  LessonReplaceView,
  LessonWhenView,
} from './lesson-forms.js';
import { cancelledLesson, course, day, group, groupItem, oldUnmarked, roster } from './org-mock.js';

const meta: Meta = { title: 'miniapp/Xodim/Guruh va darslar (MS-12, 13, 20, 21, 22)' };
export default meta;
type Story = StoryObj<typeof meta>;
const noop = () => undefined;
const today = '2026-11-24';
const rooms = [{ id: 'r1', name: '2-xona', capacity: 16 }];
const teachers = [{ id: 't1', name: 'Karimov Anvar' }];
const when = { date: today, startTime: '15:00', endTime: '16:30' };

const groups = (items: (typeof groupItem)[]) => (
  <GroupsView
    items={items}
    counts={{ g1: 9 }}
    filter="current"
    query=""
    canManage
    onFilter={noop}
    onQuery={noop}
    onOpen={noop}
    onAdd={noop}
  />
);
export const MS12_List: Story = { tags: ['primary'], render: () => groups([groupItem]) };
export const MS12_Empty: Story = { render: () => groups([]) };
export const MS12_Card: Story = {
  render: () => (
    <GroupView
      group={group}
      today={today}
      roster={roster}
      lessons={[lesson]}
      canManage
      canEditPast
      busy={false}
      onEdit={noop}
      onSchedule={noop}
      onTeacher={noop}
      onEndTeacher={noop}
      onStatus={noop}
      onStudent={noop}
      onLesson={noop}
      onAttendance={noop}
    />
  ),
};
export const MS20_New: Story = {
  render: () => (
    <GroupFormView
      title="Yangi guruh"
      mode="create"
      startLocked={false}
      form={emptyGroup(today)}
      courses={[course]}
      rooms={rooms}
      teachers={teachers}
      saving={false}
      onForm={noop}
      onSave={noop}
    />
  ),
};
export const MS20_Schedule: Story = {
  render: () => (
    <GroupScheduleView
      initial={group.slots}
      from={today}
      durationMin={90}
      saving={false}
      onSave={noop}
    />
  ),
};
export const MS20_Teacher: Story = {
  render: () => <GroupTeacherView teachers={teachers} from={today} saving={false} onSave={noop} />,
};
export const MS21_Courses: Story = {
  render: () => (
    <CatalogView
      title="Kurslar"
      empty="Kurs yoʻq"
      addText="Yangi kurs"
      items={courseRows([course])}
      filter="active"
      onFilter={noop}
      onOpen={noop}
      onAdd={noop}
    />
  ),
};
export const MS21_Course: Story = {
  render: () => (
    <CourseFormView
      title={course.name}
      form={courseForm(course)}
      saving={false}
      onForm={noop}
      onSave={noop}
      onArchive={noop}
    />
  ),
};
export const MS21_Room: Story = {
  render: () => (
    <RoomFormView
      title="2-xona"
      initial={{ name: '2-xona', capacity: 16 }}
      saving={false}
      onSave={noop}
      onArchive={noop}
    />
  ),
};
export const MS22_Week: Story = {
  render: () => (
    <CalendarView
      title="23–29-noyabr"
      week={weekDates(today).map((d) => ({ date: d, day: Number(d.slice(8)), busy: d === today }))}
      selected={today}
      lessons={[lesson, cancelledLesson]}
      onSelect={noop}
      onWeek={noop}
      onOpen={noop}
      onExtra={noop}
    />
  ),
};
export const MS22_Lesson: Story = {
  render: () => (
    <LessonView
      lesson={lesson}
      can={lessonActions(lesson, today)}
      busy={false}
      onAttendance={noop}
      onGroup={noop}
      onCancel={noop}
      onMove={noop}
      onMakeup={noop}
      onReplace={noop}
      onRestore={noop}
    />
  ),
};
export const MS22_Cancel: Story = {
  render: () => <LessonCancelView saving={false} onSave={noop} />,
};
export const MS22_Move: Story = {
  render: () => (
    <LessonWhenView
      title="Boshqa vaqtga koʻchirish"
      initial={when}
      today={today}
      rooms={rooms}
      withReason
      saving={false}
      onSave={noop}
    />
  ),
};
export const MS22_Replace: Story = {
  render: () => (
    <LessonReplaceView
      teachers={teachers}
      rooms={rooms}
      teacherId={null}
      roomId={null}
      saving={false}
      onSave={noop}
    />
  ),
};
export const MS22_Extra: Story = {
  render: () => (
    <ExtraLessonView
      groups={[groupItem]}
      rooms={rooms}
      initial={when}
      today={today}
      saving={false}
      onSave={noop}
    />
  ),
};
export const MS22_Holidays: Story = {
  render: () => (
    <HolidaysView
      year={2026}
      today={today}
      items={[{ date: '2026-12-08', name: 'Konstitutsiya kuni' }]}
      saving={false}
      onYear={noop}
      onAdd={noop}
      onDelete={noop}
    />
  ),
};
export const MS13_Day: Story = {
  render: () => (
    <AttendanceDayView
      date={today}
      today={today}
      lessons={day.lessons.map((l) => ({ lesson: l, state: l.marked ? 'marked' : 'unmarked' }))}
      absentees={day.absentees}
      oldUnmarked={[oldUnmarked]}
      onStep={noop}
      onLesson={noop}
      onStudent={noop}
    />
  ),
};
export const MS13_Month: Story = {
  render: () => (
    <GroupMonthView
      groupName="IELTS A1"
      period="2026-11"
      current="2026-11"
      students={[{ id: 's1', name: 'Aliyev Jasur', came: 7, total: 9 }]}
      lessons={[
        { id: 'l1', date: today, startTime: '15:00', cancelled: false, came: 10, total: 12 },
      ]}
      today={today}
      onStep={noop}
      onStudent={noop}
      onLesson={noop}
    />
  ),
};
export const Loading: Story = stateStories.Loading;
export const Error: Story = stateStories.Error;
export const Forbidden: Story = stateStories.Forbidden;
