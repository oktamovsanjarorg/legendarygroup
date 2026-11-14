import type { DirectorDashboardKpi } from '@lg/contracts';
import { webMessages as t } from '@lg/i18n';
import { Card, CardTitle, ErrorState, LoadingState } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api, ApiError } from '../api/client.js';
import { useAuth } from '../auth/auth.js';
import { TelegramLinkCard } from '../components/telegram-link-card.js';
import { DashboardView, type WebKpi } from '../screens/f1/dashboard.js';
import type { LessonCell } from '../screens/f1/types.js';

const toKpi = (k: DirectorDashboardKpi): WebKpi => ({
  revenueMonth: BigInt(k.revenueMonth),
  revenueDelta: k.revenueDelta,
  debtTotal: BigInt(k.debtTotal),
  activeStudents: k.activeStudents,
  attendance: k.attendance,
  queue: k.queue,
  unmarked: k.unmarked,
  joined: k.joined,
  left: k.left,
  daily: k.daily.map((d) => ({ day: d.day, amount: BigInt(d.amount) })),
});

const toLessons = (k: DirectorDashboardKpi): LessonCell[] =>
  k.todayLessons.map((l) => ({
    id: l.id,
    date: k.cachedAt.slice(0, 10),
    start: l.start,
    end: '',
    group: l.group,
    teacher: l.teacher,
    room: l.room,
  }));

/** W-04 bosh sahifa (T-405): Director/Admin — KPI'lar (5 daqiqalik kesh), boshqalar — salom. */
function StaffDashboard({ title }: { title: string }) {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ['dashboard', 'director'],
    queryFn: () => api.request<DirectorDashboardKpi>('/dashboard/director'),
  });
  const head = <h1 className="text-xl font-semibold text-text">{title}</h1>;
  if (q.isPending)
    return (
      <>
        {head}
        <LoadingState />
      </>
    );
  if (q.isError)
    return (
      <>
        {head}
        <ErrorState
          message={q.error instanceof ApiError ? q.error.message : String(q.error)}
          requestId={q.error instanceof ApiError ? q.error.requestId : undefined}
          onRetry={() => void q.refetch()}
        />
      </>
    );
  return (
    <DashboardView
      title={title}
      k={toKpi(q.data)}
      lessons={toLessons(q.data)}
      onOpen={(target) => {
        if (target === 'students') void navigate({ to: '/students' });
        if (target === 'attendance' || target === 'unmarked') void navigate({ to: '/calendar' });
      }}
    />
  );
}

export function HomePage() {
  const { me } = useAuth();
  const staff = me?.activeRole === 'director' || me?.activeRole === 'admin';
  const greeting = t.home.greeting.replace('{name}', me?.fullName ?? '');
  return (
    <div className="flex flex-col gap-4">
      {me && !me.telegramLinked && <TelegramLinkCard />}
      {staff ? (
        <StaffDashboard title={greeting} />
      ) : (
        <Card className="max-w-2xl">
          <CardTitle>{greeting}</CardTitle>
          <p className="mt-2 text-sm text-text-muted">{t.home.intro}</p>
        </Card>
      )}
    </div>
  );
}
