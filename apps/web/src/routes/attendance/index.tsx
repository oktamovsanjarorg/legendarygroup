import type { GroupAttendance, GroupListItem } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { EmptyState, ErrorState, ForbiddenState, LoadingState } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { api } from '../../api/client.js';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import { todayYmd } from '../../lib/today.js';
import { addDays } from '../../lib/ymd.js';
import { AttendanceGridView } from '../../screens/f1/attendance-grid.js';
import { toGrid } from './grid-map.js';
import { type CellTarget, MarkDrawer } from './mark-drawer.js';

/** Jadval oralig'i: so'nggi 4 hafta + bugun (FR-ATT-4). */
const SPAN_DAYS = 27;

function Grid({
  groupId,
  groups,
  onGroup,
}: {
  groupId: string;
  groups: readonly { value: string; label: string }[];
  onGroup: (id: string) => void;
}) {
  const today = todayYmd();
  const from = addDays(today, -SPAN_DAYS);
  const q = useQuery({
    queryKey: ['attendance', 'grid', groupId, from, today],
    queryFn: () =>
      api.request<GroupAttendance>(
        `/attendance/groups?groupId=${groupId}&from=${from}&to=${today}`,
      ),
  });
  const [cell, setCell] = useState<CellTarget | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  if (q.isPending) return <LoadingState rows={6} />;
  if (q.isError) return <ErrorState {...errorView(q.error, () => void q.refetch())} />;
  const g = toGrid(q.data, groups, today);
  const open = (rowId: string, col: number) => {
    const row = g.rows.find((r) => r.id === rowId);
    const lessonId = g.lessonIds[col];
    const lessonDate = g.lessonDates[col];
    if (row && lessonId && lessonDate)
      setCell({
        lessonId,
        lessonDate,
        studentId: row.id,
        name: row.name,
        label: g.dates[col] ?? '',
      });
  };
  return (
    <>
      {notice && (
        <p role="status" className="mb-4 rounded-md bg-success-bg p-3 text-sm text-success">
          {notice}
        </p>
      )}
      <AttendanceGridView g={g} onGroup={onGroup} onCell={open} />
      {cell && (
        <MarkDrawer
          c={cell}
          today={today}
          onClose={() => setCell(null)}
          onDone={(m) => {
            setCell(null);
            setNotice(m ?? null);
          }}
        />
      )}
    </>
  );
}

function AttendanceScreen() {
  const groups = useQuery({
    queryKey: ['groups', 'list', 'current'],
    queryFn: () => api.request<GroupListItem[]>('/groups?status=current'),
  });
  const [picked, setPicked] = useState<string | null>(null);
  if (groups.isPending) return <LoadingState rows={4} />;
  if (groups.isError)
    return <ErrorState {...errorView(groups.error, () => void groups.refetch())} />;
  const options = groups.data.map((g) => ({ value: g.id, label: g.name }));
  const groupId = picked ?? options[0]?.value;
  if (!groupId) return <EmptyState title={t.attendanceGrid.noGroups} />;
  return <Grid key={groupId} groupId={groupId} groups={options} onGroup={setPicked} />;
}

/** W-12 Davomat (T-112, FR-ATT-4/5, BR-30): `attendance.mark` + guruhlar ro'yxati. */
export function AttendancePage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('attendance.mark') || !permissions.has('group.view'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <AttendanceScreen />;
}
