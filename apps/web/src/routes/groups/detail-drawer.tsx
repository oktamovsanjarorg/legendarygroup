import { GROUP_STATUS_FLOW, type GroupDetail } from '@lg/contracts';
import { formatMoney, formatYmd, webMessages as t } from '@lg/i18n';
import { Badge, Button, Drawer, ErrorState, LoadingState } from '@lg/ui-web';
import { errorView } from '../../api/errors.js';
import { GROUP_TONE } from '../../screens/f1/groups.js';
import { EditSection } from './edit-section.js';
import { ScheduleSection } from './schedule-section.js';
import { ActionError, Section } from './section.js';
import { TeachersSection } from './teachers-section.js';
import { type FormOptions, useGroupCall, useGroupDetail, useRoster } from './use-groups.js';

const d = t.groups.detail;
/** O'tish mumkin bo'lgan holatlar (`forming`ga qaytilmaydi). */
type NextStatus = keyof typeof d.statusActions;

function Summary({ g }: { g: GroupDetail }) {
  const period = g.endDate
    ? d.range.replace('{from}', formatYmd(g.startDate)).replace('{to}', formatYmd(g.endDate))
    : d.from.replace('{from}', formatYmd(g.startDate));
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      <dt className="text-text-muted">{t.groups.cols.status}</dt>
      <dd>
        <Badge tone={GROUP_TONE[g.status]}>{t.groups.status[g.status]}</Badge>
      </dd>
      <dt className="text-text-muted">{d.course}</dt>
      <dd className="text-text">{g.course.name}</dd>
      <dt className="text-text-muted">{d.room}</dt>
      <dd className="text-text">{g.room?.name ?? d.noRoom}</dd>
      <dt className="text-text-muted">{d.price}</dt>
      <dd className="tabular-nums text-text">{formatMoney(BigInt(g.monthlyPrice))}</dd>
      <dt className="text-text-muted">{d.period}</dt>
      <dd className="tabular-nums text-text">{period}</dd>
    </dl>
  );
}

/** Holat tugmalari (FR-ORG-3): faqat ruxsat etilgan o'tishlar; yakunlash — tasdiq bilan. */
function StatusActions({ g, form }: { g: GroupDetail; form: FormOptions }) {
  const change = useGroupCall();
  const next: readonly NextStatus[] = GROUP_STATUS_FLOW[g.status];
  const go = (status: NextStatus) => {
    const sure = status !== 'finished' || window.confirm(d.confirmFinish.replace('{name}', g.name));
    if (sure) change.mutate({ path: `/groups/${g.id}/status`, method: 'POST', body: { status } });
  };
  if (next.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {next.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={s === 'finished' ? 'ghost' : 'secondary'}
            disabled={change.isPending}
            onClick={() => go(s)}
          >
            {d.statusActions[s]}
          </Button>
        ))}
      </div>
      <ActionError error={change.error} nameOf={form.nameOf} />
    </div>
  );
}

/** Bugungi ro'yxat (BR-32) — PII'siz: kod va ism. */
function Roster({ id }: { id: string }) {
  const roster = useRoster(id);
  if (roster.isPending) return <LoadingState rows={2} />;
  if (roster.isError)
    return <ErrorState {...errorView(roster.error, () => void roster.refetch())} />;
  const { items, capacity } = roster.data;
  const title = d.students.replace('{n}', String(items.length)).replace('{max}', String(capacity));
  return (
    <Section title={title}>
      {items.length === 0 && <p className="text-sm text-text-muted">{d.noStudents}</p>}
      <ul className="flex flex-col gap-1">
        {items.map((s) => (
          <li key={s.enrollmentId} className="flex items-center gap-2 text-sm text-text">
            <span className="tabular-nums text-text-muted">LG-{s.code}</span>
            <span className="flex-1">{s.fullName}</span>
            {s.state !== 'active' && <Badge tone="muted">{d.states[s.state]}</Badge>}
          </li>
        ))}
      </ul>
    </Section>
  );
}

interface Props {
  id: string;
  name: string;
  form: FormOptions;
  canManage: boolean;
  onClose: () => void;
}

/** W-10 tafsilot: holat, ma'lumot, jadval, ustozlar, o'quvchilar. Yakunlangan guruh — faqat o'qish. */
export function DetailDrawer({ id, name, form, canManage, onClose }: Props) {
  const detail = useGroupDetail(id);
  const g = detail.data;
  const editable = canManage && g?.status !== 'finished';
  return (
    <Drawer open title={g?.name ?? name} closeLabel={t.common.close} onClose={onClose}>
      {detail.isPending ? (
        <LoadingState rows={5} />
      ) : !g ? (
        <ErrorState {...errorView(detail.error, () => void detail.refetch())} />
      ) : (
        <div className="flex flex-col gap-4">
          <Summary g={g} />
          {editable && <StatusActions g={g} form={form} />}
          {editable && <EditSection g={g} form={form} />}
          <ScheduleSection g={g} form={form} canManage={editable} />
          <TeachersSection g={g} form={form} canManage={editable} />
          <Roster id={id} />
        </div>
      )}
    </Drawer>
  );
}
