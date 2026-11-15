import type {
  ChurnRiskResponse,
  GroupOccupancyResponse,
  RevenueForecastResponse,
} from '@lg/contracts';
import { ForbiddenState } from '@lg/ui-web';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { api } from '../../api/client.js';
import { errorView } from '../../api/errors.js';
import { useAuth } from '../../auth/auth.js';
import type { ChurnStudentItem, ForecastMonth, OccupancyItem } from '../../screens/f3/types.js';
import { ForecastsView, type Section } from '../../screens/f3/w27-forecasts.js';

export const toMonths = (r: RevenueForecastResponse): ForecastMonth[] =>
  r.items.map((i) => ({
    month: i.month,
    lower: BigInt(i.lowerBound),
    expected: BigInt(i.expected),
    upper: BigInt(i.upperBound),
  }));

/** Faqat xavfli (BR-36: ≥ 60); sabablar — ball qo'shgan omillar, kattasi birinchi. */
export const toChurn = (r: ChurnRiskResponse): ChurnStudentItem[] =>
  r.items
    .filter((i) => i.isAtRisk)
    .map((i) => ({
      id: i.studentId,
      name: i.studentName,
      group: i.groupName,
      riskScore: i.churnScore,
      factors: i.factors
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .map((x) => ({ factor: x.factor, score: x.score })),
    }));

export const toOccupancy = (r: GroupOccupancyResponse): OccupancyItem[] =>
  r.items.map((i) => ({
    id: i.groupId,
    group: i.groupName,
    capacity: i.capacity,
    active: i.currentActive,
    occupancyPercent: i.occupancyRateBp / 100,
    projectedChurn: i.projectedChurn,
    projectedPercent: i.projectedOccupancyRateBp / 100,
  }));

function useSection<R, T>(path: string, map: (r: R) => T[], enabled = true) {
  const q = useQuery({
    queryKey: ['forecasts', path],
    queryFn: () => api.request<R>(`/forecasts/${path}`),
    enabled,
  });
  const section: Section<T> = {
    rows: q.data ? map(q.data) : [],
    loading: q.isPending,
    error: q.isError ? errorView(q.error, () => void q.refetch()) : undefined,
  };
  return { q, section };
}

function ForecastsScreen({ finance }: { finance: boolean }) {
  const navigate = useNavigate();
  const revenue = useSection('revenue', toMonths, finance);
  const churn = useSection('churn', toChurn);
  const occupancy = useSection('occupancy', toOccupancy);
  const total = churn.q.data?.totalStudents ?? null;
  return (
    <ForecastsView
      revenue={finance ? revenue.section : null}
      churn={{ ...churn.section, total }}
      occupancy={occupancy.section}
      onOpenStudent={(id) => void navigate({ to: '/students/$id', params: { id } })}
    />
  );
}

/** W-27 Prognozlar (T-502, FR-DASH-3): `stats.operational`; tushum — `finance.view`. */
export function ForecastsPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('stats.operational'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <ForecastsScreen finance={permissions.has('finance.view')} />;
}
