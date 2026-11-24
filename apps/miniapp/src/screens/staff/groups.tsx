import {
  GROUP_STATUS_FLOW,
  type GroupDetail,
  type GroupListItem,
  type GroupStatus,
  type GroupTeacher,
  type LessonDto,
  type RosterItem,
} from '@lg/contracts';
import { formatMoney, formatYmd, miniappMessages as t } from '@lg/i18n';
import {
  EmptyState,
  ListItem,
  SearchField,
  Section,
  Segmented,
  useMainButton,
  useSecondaryButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import { scheduleText } from '../../data/staff-groups.js';
import { EmptyRow, InfoSection, Screen } from './form-kit.js';
import { ConfirmSheet } from './kit.js';

const c = t.staffGroups;
export type GroupsFilter = keyof typeof c.filters;

export interface GroupsViewProps {
  items: readonly GroupListItem[];
  counts: Readonly<Record<string, number>>;
  filter: GroupsFilter;
  query: string;
  canManage: boolean;
  onFilter: (f: GroupsFilter) => void;
  onQuery: (q: string) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

/** MS-12 Guruhlar (T-136): holat, ustoz, jadval, to'lganlik; MainButton — yangi guruh. */
export function GroupsView(p: GroupsViewProps) {
  useMainButton({ text: c.add, visible: p.canManage, onClick: p.onAdd });
  return (
    <Screen title={c.title}>
      <Segmented<GroupsFilter>
        label={c.filterLabel}
        value={p.filter}
        options={(['current', 'finished'] as const).map((value) => ({
          value,
          label: c.filters[value],
        }))}
        onChange={p.onFilter}
      />
      <SearchField
        clearLabel={c.clear}
        value={p.query}
        onChange={p.onQuery}
        placeholder={c.search}
      />
      {p.items.length === 0 ? (
        <EmptyState title={c.empty} hint={p.canManage ? c.emptyHint : undefined} />
      ) : (
        <Section>
          {p.items.map((g) => (
            <ListItem
              key={g.id}
              title={g.status === 'active' ? g.name : `${g.name} · ${c.statuses[g.status]}`}
              subtitle={[
                g.mainTeacher?.fullName ?? c.noTeacher,
                scheduleText(g.slots) || c.noSchedule,
              ].join(' · ')}
              after={c.filled
                .replace('{n}', String(p.counts[g.id] ?? 0))
                .replace('{max}', String(g.maxStudents))}
              chevron
              onClick={() => p.onOpen(g.id)}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

export interface GroupViewProps {
  group: GroupDetail;
  today: string;
  roster: readonly RosterItem[];
  lessons: readonly LessonDto[];
  canManage: boolean;
  canEditPast: boolean;
  busy: boolean;
  onEdit: () => void;
  onSchedule: () => void;
  onTeacher: () => void;
  onEndTeacher: (assignmentId: string) => void;
  onStatus: (s: GroupStatus) => void;
  onStudent: (id: string) => void;
  onLesson: (id: string) => void;
  onAttendance: () => void;
}

const teacherLine = (x: GroupTeacher, today: string) =>
  [
    c[x.role],
    x.from > today && c.from.replace('{d}', formatYmd(x.from)),
    x.to && c.until.replace('{d}', formatYmd(x.to)),
  ]
    .filter(Boolean)
    .join(' · ');

function Teachers({ p }: { p: GroupViewProps }) {
  const current = p.group.teachers.filter((x) => x.to === null || x.to >= p.today);
  const [ending, setEnding] = useState<GroupTeacher | null>(null);
  return (
    <Section title={c.teachers}>
      {current.length === 0 && <EmptyRow text={c.noTeacher} />}
      {current.map((x) => {
        const canEnd = p.canManage && x.role === 'assistant' && x.to === null;
        return (
          <ListItem
            key={x.id}
            title={x.fullName}
            subtitle={teacherLine(x, p.today)}
            after={canEnd ? <span className="text-danger">{c.remove}</span> : undefined}
            onClick={canEnd ? () => setEnding(x) : undefined}
          />
        );
      })}
      <ConfirmSheet
        open={ending !== null}
        title={c.endAssistant}
        action={c.endAssistant}
        danger
        onClose={() => setEnding(null)}
        onConfirm={() => ending && p.onEndTeacher(ending.id)}
      >
        {c.endAssistantAsk.replace('{name}', ending?.fullName ?? '')}
      </ConfirmSheet>
    </Section>
  );
}

function Roster({ p }: { p: GroupViewProps }) {
  const list = p.roster.filter((s) => s.state !== 'ended');
  const filled = c.filled
    .replace('{n}', String(list.length))
    .replace('{max}', String(p.group.maxStudents));
  return (
    <Section title={`${c.students} · ${filled}`}>
      {list.length === 0 && <EmptyRow text={c.noStudents} />}
      {list.map((s) => (
        <ListItem
          key={s.enrollmentId}
          title={s.fullName}
          subtitle={c.states[s.state] || undefined}
          chevron
          onClick={() => p.onStudent(s.studentId)}
        />
      ))}
    </Section>
  );
}

function Actions({ p }: { p: GroupViewProps }) {
  const [next, setNext] = useState<GroupStatus | null>(null);
  const flow: readonly GroupStatus[] = GROUP_STATUS_FLOW[p.group.status];
  const link = (text: string, onClick: () => void, danger = false) => (
    <ListItem
      key={text}
      title={<span className={danger ? 'text-danger' : 'text-link'}>{text}</span>}
      disabled={p.busy}
      onClick={onClick}
    />
  );
  if (flow.length === 0) return null;
  return (
    <Section title={c.actions}>
      {link(c.changeSchedule, p.onSchedule)}
      {link(c.addTeacher, p.onTeacher)}
      {flow.map((s) => link(c.to[s], () => setNext(s), s === 'finished'))}
      <ConfirmSheet
        open={next !== null}
        title={next ? c.to[next] : ''}
        action={next ? c.to[next] : ''}
        danger={next === 'finished'}
        onClose={() => setNext(null)}
        onConfirm={() => next && p.onStatus(next)}
      >
        {next && (next === 'active' && p.group.status === 'forming' ? null : c.ask[next])}
      </ConfirmSheet>
    </Section>
  );
}

/** Guruh kartochkasi (MS-12; amallar — MS-20, `group.manage`). */
export function GroupView(p: GroupViewProps) {
  const g = p.group;
  useSecondaryButton({
    text: c.edit,
    visible: p.canManage && g.status !== 'finished',
    onClick: p.onEdit,
  });
  return (
    <Screen title={g.name} subtitle={c.statuses[g.status]}>
      <InfoSection
        items={[
          { label: c.course, value: g.course.name },
          { label: c.schedule, value: scheduleText(g.slots) || c.noSchedule },
          { label: c.room, value: g.room?.name ?? c.noRoom },
          { label: c.price, value: formatMoney(BigInt(g.monthlyPrice)) },
          {
            label: c.dates,
            value: g.endDate
              ? `${formatYmd(g.startDate)} – ${formatYmd(g.endDate)}`
              : c.from.replace('{d}', formatYmd(g.startDate)),
          },
        ]}
      />
      <Teachers p={p} />
      <Roster p={p} />
      <Section title={c.upcoming}>
        {p.lessons.length === 0 && <EmptyRow text={c.noLessons} />}
        {p.lessons.slice(0, 6).map((l) => (
          <ListItem
            key={l.id}
            title={`${formatYmd(l.date)} · ${l.startTime}–${l.endTime}`}
            subtitle={[l.teacher?.name, l.room?.name].filter(Boolean).join(' · ') || undefined}
            chevron
            onClick={() => p.onLesson(l.id)}
          />
        ))}
        {p.canEditPast && (
          <ListItem
            title={<span className="text-link">{c.monthAttendance}</span>}
            chevron
            onClick={p.onAttendance}
          />
        )}
      </Section>
      {p.canManage && <Actions p={p} />}
    </Screen>
  );
}
