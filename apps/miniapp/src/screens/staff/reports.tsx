import type { ReportType } from '@lg/contracts';
import { miniappMessages as t, reportMessages as r } from '@lg/i18n';
import {
  ActionSheet,
  KpiTile,
  ListItem,
  MoneyText,
  Section,
  Segmented,
  useMainButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import type { ReportGroupBy, ReportView } from '../../data/staff-reports.js';
import { EmptyRow, Screen } from './form-kit.js';
import { PeriodBar } from './kit.js';

const c = t.staffReports;

const Value = ({ value }: { value: bigint | string }) =>
  typeof value === 'bigint' ? <MoneyText amount={value} /> : <span>{value}</span>;

/** MS-29 Hisobotlar ro'yxati (T-158). */
export function ReportsMenuView(p: {
  types: readonly ReportType[];
  onOpen: (type: ReportType) => void;
}) {
  return (
    <Screen title={c.title}>
      <Section>
        {p.types.map((x) => (
          <ListItem
            key={x}
            title={r.titles[x]}
            subtitle={c.hints[x]}
            chevron
            onClick={() => p.onOpen(x)}
          />
        ))}
      </Section>
    </Screen>
  );
}

export interface ReportDetailProps {
  type: ReportType;
  view: ReportView;
  groups: readonly ReportGroupBy[];
  groupBy: ReportGroupBy | null;
  onGroupBy: (g: ReportGroupBy) => void;
  /** `null` — davr tanlanmaydi (bugungi holat yoki 12 oy). */
  period: { value: string; current: string; onStep: (s: -1 | 1) => void } | null;
  sending: boolean;
  onSend: (format: 'excel' | 'pdf') => void;
  onStudent: (id: string) => void;
}

function Filters(p: ReportDetailProps) {
  const label = p.type === 'revenue' ? c.yearHint : c.asOfNow;
  return (
    <>
      {p.groups.length > 1 && p.groupBy && (
        <Segmented<ReportGroupBy>
          label={c.groupBy}
          value={p.groupBy}
          options={p.groups.map((g) => ({ value: g, label: c.by[g] }))}
          onChange={p.onGroupBy}
        />
      )}
      {p.period ? (
        <PeriodBar period={p.period.value} current={p.period.current} onStep={p.period.onStep} />
      ) : (
        <p className="px-2 text-sm text-text-muted">{label}</p>
      )}
    </>
  );
}

/** MS-29a Bitta hisobot: filtr → xulosa → qatorlar; fayl — bot chatiga. */
export function ReportDetailView(p: ReportDetailProps) {
  const [ask, setAsk] = useState(false);
  useMainButton({ text: c.file, loading: p.sending, onClick: () => setAsk(true) });
  const send = (format: 'excel' | 'pdf') => () => {
    setAsk(false);
    p.onSend(format);
  };
  return (
    <Screen title={r.titles[p.type]}>
      <Filters {...p} />
      {p.view.kpi.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {p.view.kpi.map((k) => (
            <KpiTile key={k.label} label={k.label} value={<Value value={k.value} />} />
          ))}
        </div>
      )}
      <Section>
        {p.view.rows.length === 0 && <EmptyRow text={r.empty} />}
        {p.view.rows.map((x) => {
          const { studentId } = x;
          return (
            <ListItem
              key={x.id}
              title={x.title}
              subtitle={x.subtitle}
              after={<Value value={x.value} />}
              onClick={studentId ? () => p.onStudent(studentId) : undefined}
            />
          );
        })}
      </Section>
      <ActionSheet
        open={ask}
        title={c.file}
        cancelLabel={t.staffKit.cancel}
        onClose={() => setAsk(false)}
        actions={[
          { label: c.excel, onSelect: send('excel') },
          { label: c.pdf, onSelect: send('pdf') },
        ]}
      />
    </Screen>
  );
}
