import type { AuditLogItem, StaffActivityItem, SuspiciousActivityItem } from '@lg/contracts';
import { formatDateTime, miniappMessages as t } from '@lg/i18n';
import { EmptyState, InlineButton, ListItem, Section, Segmented, StatusChip } from '@lg/ui-tg';
import type { ReactNode } from 'react';
import { type AuditFilter, diffText } from '../../data/staff-audit.js';
import { EmptyRow, InfoSection, Screen } from './form-kit.js';
import { PeriodBar } from './kit.js';

const c = t.audit;
export type AuditTab = keyof typeof c.tabs;
const TABS: readonly AuditTab[] = ['log', 'suspicious', 'staff'];
const FILTERS = Object.keys(c.filters) as AuditFilter[];
const when = (iso: string) => formatDateTime(new Date(iso));
export const actionLabel = (code: string): string =>
  (t.auditActions as Record<string, string>)[code] ?? code;

/** MS-33 Audit (T-162): uch bo'lim — jurnal, shubhali, xodimlar. */
export function AuditScreen(p: {
  tab: AuditTab;
  onTab: (x: AuditTab) => void;
  children: ReactNode;
}) {
  return (
    <Screen title={c.title}>
      <Segmented<AuditTab>
        label={c.tabLabel}
        value={p.tab}
        options={TABS.map((value) => ({ value, label: c.tabs[value] }))}
        onChange={p.onTab}
      />
      {p.children}
    </Screen>
  );
}

export function AuditLogList(p: {
  items: readonly AuditLogItem[];
  filter: AuditFilter;
  hasMore: boolean;
  onFilter: (f: AuditFilter) => void;
  onMore: () => void;
  onOpen: (x: AuditLogItem) => void;
}) {
  return (
    <>
      <div role="group" aria-label={c.filter} className="flex gap-2 overflow-x-auto px-2 pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={p.filter === f}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${p.filter === f ? 'bg-primary text-primary-text' : 'bg-bg text-text'}`}
            onClick={() => p.onFilter(f)}
          >
            {c.filters[f]}
          </button>
        ))}
      </div>
      {p.items.length === 0 ? (
        <EmptyState title={c.empty} />
      ) : (
        <Section>
          {p.items.map((x) => (
            <ListItem
              key={x.id}
              title={actionLabel(x.action)}
              subtitle={`${x.userName} · ${when(x.timestamp)}`}
              chevron
              onClick={() => p.onOpen(x)}
            />
          ))}
        </Section>
      )}
      {p.hasMore && <InlineButton onClick={p.onMore}>{t.staffKit.more}</InlineButton>}
    </>
  );
}

export function SuspiciousList({ items }: { items: readonly SuspiciousActivityItem[] }) {
  if (items.length === 0) return <EmptyState title={c.suspiciousEmpty} />;
  return (
    <Section>
      {items.map((x) => (
        <ListItem
          key={x.id}
          title={x.title}
          subtitle={`${x.userName} · ${actionLabel(x.action)} · ${when(x.timestamp)}`}
          after={
            <StatusChip tone={x.riskLevel === 'high' ? 'danger' : 'warning'}>
              {c[x.riskLevel]}
            </StatusChip>
          }
        />
      ))}
    </Section>
  );
}

export function StaffActivityList(p: {
  items: readonly StaffActivityItem[];
  period: string;
  current: string;
  onPeriod: (step: -1 | 1) => void;
}) {
  return (
    <>
      <PeriodBar period={p.period} current={p.current} onStep={p.onPeriod} />
      <Section>
        {p.items.length === 0 && <EmptyRow text={c.empty} />}
        {p.items.map((x) => (
          <ListItem
            key={x.staffId}
            title={x.staffName}
            subtitle={`${c.payments.replace('{n}', String(x.paymentsCount))} · ${
              x.approvalsCount === 0
                ? c.noApprovals
                : c.approvals
                    .replace('{n}', String(x.approvalsCount))
                    .replace('{t}', x.avgResponseTimeFormatted)
            }`}
          />
        ))}
      </Section>
    </>
  );
}

/** Bitta yozuv: kim, qachon, nima o'zgardi (oldin → keyin). */
export function AuditItemView({ item: x }: { item: AuditLogItem }) {
  return (
    <Screen title={actionLabel(x.action)}>
      <InfoSection
        items={[
          { label: c.who, value: x.userName },
          { label: c.when, value: when(x.timestamp) },
          { label: c.device, value: [x.ip, x.userAgent].filter(Boolean).join(' · ') },
        ]}
      />
      <Section title={c.changes}>
        {!x.diff?.length && <EmptyRow text={c.noChanges} />}
        {x.diff?.map((d) => (
          <ListItem
            key={d.field}
            title={
              <span className="break-words">
                <s className="text-text-muted">{diffText(d.before)}</s> → {diffText(d.after)}
              </span>
            }
            subtitle={d.field}
          />
        ))}
      </Section>
    </Screen>
  );
}
