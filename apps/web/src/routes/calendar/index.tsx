import type { LessonDto } from '@lg/contracts';
import { formatDate, formatMonth, webMessages as t } from '@lg/i18n';
import { Button, ForbiddenState, SelectField } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { CalendarOff, Plus } from 'lucide-react';
import { useState } from 'react';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import { addDays, addMonths, monthGrid, range, toDate, weekStart } from '../../lib/ymd.js';
import { type CalendarMode, CalendarView } from '../../screens/f1/calendar.js';
import type { LessonCell, LessonCellKind } from '../../screens/f1/types.js';
import { ExtraDrawer } from './extra-drawer.js';
import { HolidaysDrawer } from './holidays-drawer.js';
import { LessonDrawer } from './lesson-drawer.js';
import {
  type CalendarOptions,
  useCalendarOptions,
  useHolidays,
  useLessons,
} from './use-calendar.js';

const kindOf = (l: LessonDto): LessonCellKind | undefined => {
  if (l.status === 'cancelled') return 'cancelled';
  if (l.isSubstitute) return 'substitute';
  return l.kind === 'regular' ? undefined : l.kind;
};

const toCell = (l: LessonDto): LessonCell => ({
  id: l.id,
  date: l.date,
  start: l.startTime,
  end: l.endTime,
  group: l.group.name,
  teacher: l.teacher?.name ?? t.calendar.lesson.noTeacher,
  room: l.room?.name ?? t.calendar.lesson.noRoom,
  kind: kindOf(l),
});

/** `9–15-noyabr, 2026`; oy chegarasidan o'tsa — `30-noyabr – 6-dekabr, 2026`. */
export function weekTitle(from: string, to: string): string {
  const end = formatDate(toDate(to));
  return from.slice(0, 7) === to.slice(0, 7)
    ? `${Number(from.slice(8))}–${end}`
    : `${formatDate(toDate(from), { withYear: false })} – ${end}`;
}

type Panel = { kind: 'lesson'; id: string } | { kind: 'extra' } | { kind: 'holidays' } | null;
type Filter = { groupId: string; teacherId: string };

interface ScreenProps {
  canManage: boolean;
  withRooms: boolean;
}

interface ToolbarProps {
  options: CalendarOptions;
  filter: Filter;
  canManage: boolean;
  onFilter: (f: Filter) => void;
  onPanel: (p: Panel) => void;
}

function Toolbar({ options, filter, canManage, onFilter, onPanel }: ToolbarProps) {
  const pick = (k: keyof Filter) => ({
    value: filter[k],
    onChange: (e: { target: { value: string } }) => onFilter({ ...filter, [k]: e.target.value }),
  });
  return (
    <>
      <SelectField
        label={t.calendar.filterGroup}
        options={[{ value: '', label: t.calendar.allGroups }, ...options.groups]}
        {...pick('groupId')}
      />
      <SelectField
        label={t.calendar.filterTeacher}
        options={[{ value: '', label: t.calendar.allTeachers }, ...options.teachers]}
        {...pick('teacherId')}
      />
      <Button variant="secondary" className="ml-auto" onClick={() => onPanel({ kind: 'holidays' })}>
        <CalendarOff className="size-4" aria-hidden />
        {t.calendar.holidays}
      </Button>
      {canManage && (
        <Button onClick={() => onPanel({ kind: 'extra' })}>
          <Plus className="size-4" aria-hidden />
          {t.calendar.addExtra}
        </Button>
      )}
    </>
  );
}

/** Ko'rinish davri: hafta (7 kun) yoki oy to'ri (to'liq haftalar). */
function periodOf(mode: CalendarMode, anchor: string) {
  const days = mode === 'week' ? range(weekStart(anchor), 7) : monthGrid(anchor);
  const from = days[0] ?? anchor;
  const to = days.at(-1) ?? anchor;
  const title = mode === 'week' ? weekTitle(from, to) : formatMonth(toDate(anchor));
  return { days, from, to, title };
}

interface PanelsProps {
  panel: Panel;
  lesson: LessonDto | undefined;
  anchor: string;
  options: CalendarOptions;
  canManage: boolean;
  onClose: () => void;
}

function Panels({ panel, lesson, anchor, options, canManage, onClose }: PanelsProps) {
  if (lesson)
    return (
      <LessonDrawer
        key={lesson.id}
        l={lesson}
        options={options}
        canManage={canManage}
        onDone={onClose}
      />
    );
  if (panel?.kind === 'extra')
    return <ExtraDrawer date={anchor} options={options} onClose={onClose} />;
  if (panel?.kind === 'holidays')
    return <HolidaysDrawer year={anchor.slice(0, 4)} canManage={canManage} onClose={onClose} />;
  return null;
}

function CalendarScreen({ canManage, withRooms }: ScreenProps) {
  const today = todayYmd();
  const [mode, setMode] = useState<CalendarMode>('week');
  const [anchor, setAnchor] = useState(today);
  const [filter, setFilter] = useState<Filter>({ groupId: '', teacherId: '' });
  const [panel, setPanel] = useState<Panel>(null);
  const { days, from, to, title } = periodOf(mode, anchor);
  const lessons = useLessons({ from, to, ...filter });
  const holidays = useHolidays(from, to);
  const options = useCalendarOptions(withRooms);
  const step = (dir: 1 | -1) =>
    setAnchor(mode === 'week' ? addDays(anchor, 7 * dir) : addMonths(anchor, dir));
  const openId = panel?.kind === 'lesson' ? panel.id : null;
  return (
    <>
      <CalendarView
        mode={mode}
        title={title}
        days={days.map((ymd) => ({ ymd, holiday: holidays.get(ymd) }))}
        lessons={(lessons.data ?? []).map(toCell)}
        today={today}
        month={anchor.slice(0, 7)}
        loading={lessons.isPending}
        error={lessons.isError ? errorView(lessons.error, () => void lessons.refetch()) : undefined}
        toolbar={
          <Toolbar
            options={options}
            filter={filter}
            canManage={canManage}
            onFilter={setFilter}
            onPanel={setPanel}
          />
        }
        onMode={setMode}
        onPrev={() => step(-1)}
        onToday={() => setAnchor(today)}
        onNext={() => step(1)}
        onLesson={(l) => setPanel({ kind: 'lesson', id: l.id })}
        onDay={(ymd) => {
          setAnchor(ymd);
          setMode('week');
        }}
      />
      <Panels
        panel={panel}
        lesson={lessons.data?.find((l) => l.id === openId)}
        anchor={anchor}
        options={options}
        canManage={canManage}
        onClose={() => setPanel(null)}
      />
    </>
  );
}

/** W-11 Jadval (T-104, FR-ORG-5): ko'rish — `group.view` (Ustoz — o'z darslari), amallar — `lesson.manage`. */
export function CalendarPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('group.view'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return (
    <CalendarScreen
      canManage={permissions.has('lesson.manage')}
      withRooms={permissions.has('course.manage')}
    />
  );
}
