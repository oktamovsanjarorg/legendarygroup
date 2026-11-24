import type { BacktestReportResponse, RevenueForecastResponse } from '@lg/contracts';
import { formatMoney, formatPeriod, miniappMessages as t } from '@lg/i18n';
import { ListItem, MoneyText, Section, Segmented, StatusChip } from '@lg/ui-tg';
import { useState } from 'react';
import { churnReasons, type Forecasts, moneyRange, pct } from '../../data/staff-reports.js';
import { EmptyRow, Screen } from './form-kit.js';

const c = t.staffForecasts;

function Revenue({
  revenue,
  backtest,
}: {
  revenue: RevenueForecastResponse;
  backtest: BacktestReportResponse;
}) {
  return (
    <>
      <Section title={c.revenue}>
        {revenue.items.map((i) => (
          <ListItem
            key={i.month}
            title={formatPeriod(i.month)}
            subtitle={[
              moneyRange(i.lowerBound, i.upperBound),
              c.enrollments
                .replace('{n}', String(i.activeEnrollmentsCount))
                .replace('{p}', pct(i.historicalCollectionRateBp)),
            ].join(' · ')}
            after={<MoneyText amount={BigInt(i.expected)} />}
          />
        ))}
      </Section>
      <Section title={`${c.backtest}: ${formatPeriod(backtest.period)}`}>
        <ListItem
          title={c.backtestRow
            .replace('{a}', formatMoney(BigInt(backtest.predictedRevenue)))
            .replace('{b}', formatMoney(BigInt(backtest.actualRevenue)))
            .replace('{p}', String(backtest.errorPercentage).replace('.', ','))}
        />
        <ListItem
          title={c.churnRow
            .replace('{a}', String(backtest.predictedChurnCount))
            .replace('{b}', String(backtest.actualChurnCount))}
        />
      </Section>
    </>
  );
}

function Churn({ data, onStudent }: { data: Forecasts['churn']; onStudent: (id: string) => void }) {
  const [scope, setScope] = useState<'risk' | 'all'>('risk');
  const shown = scope === 'risk' ? data.items.filter((i) => i.isAtRisk) : data.items;
  const count = c.riskCount
    .replace('{n}', String(data.atRiskCount))
    .replace('{m}', String(data.totalStudents));
  return (
    <>
      <Segmented
        label={c.risk}
        value={scope}
        options={[
          { value: 'risk', label: c.onlyRisk },
          { value: 'all', label: c.all },
        ]}
        onChange={setScope}
      />
      <Section title={`${c.risk}: ${count}`}>
        {shown.length === 0 && <EmptyRow text={c.riskEmpty} />}
        {shown.map((i) => (
          <ListItem
            key={i.studentId}
            title={i.studentName}
            subtitle={[i.groupName, churnReasons(i.factors)].filter(Boolean).join(' · ')}
            after={
              <StatusChip tone={i.isAtRisk ? 'danger' : 'muted'}>
                {c.score.replace('{n}', String(i.churnScore))}
              </StatusChip>
            }
            onClick={() => onStudent(i.studentId)}
          />
        ))}
      </Section>
    </>
  );
}

/** MS-30 Prognozlar (T-159, FR-DASH-3, BR-36): tushum oralig'i, xavfli o'quvchilar «nega» bilan. */
export function ForecastsView(p: { data: Forecasts; onStudent: (id: string) => void }) {
  const { revenue, backtest, churn, occupancy } = p.data;
  return (
    <Screen title={c.title}>
      {revenue && backtest && <Revenue revenue={revenue} backtest={backtest} />}
      <Churn data={churn} onStudent={p.onStudent} />
      <Section title={c.occupancy}>
        {occupancy.items.map((g) => (
          <ListItem
            key={g.groupId}
            title={g.groupName}
            subtitle={[
              c.occupancyRow
                .replace('{a}', String(g.currentActive))
                .replace('{b}', String(g.capacity)),
              g.projectedChurn > 0 && c.occupancyRisk.replace('{n}', String(g.projectedChurn)),
            ]
              .filter(Boolean)
              .join(' · ')}
            after={pct(g.occupancyRateBp)}
          />
        ))}
      </Section>
    </Screen>
  );
}
