import type { EnrollmentDto, FreezeDto, GroupListItem } from '@lg/contracts';
import { formatYmd, miniappMessages as t } from '@lg/i18n';
import {
  type ChipTone,
  ListItem,
  Section,
  StatusChip,
  TextArea,
  TextField,
  useMainButton,
} from '@lg/ui-tg';
import { ArrowRightLeft, LogOut, Percent, Snowflake } from 'lucide-react';
import { useState } from 'react';
import { freezeAction } from '../../data/staff-profile.js';
import { enrollmentDates } from '../../data/staff-student.js';
import { EmptyRow, Fields, Screen } from './form-kit.js';
import { ChoiceSection, ConfirmSheet } from './kit.js';

const c = t.staffEnroll;
const TONES: Record<EnrollmentDto['state'], ChipTone> = {
  upcoming: 'info',
  active: 'success',
  frozen: 'warning',
  ended: 'muted',
};

export const EnrollmentState = ({ state }: { state: EnrollmentDto['state'] }) => (
  <StatusChip tone={TONES[state]}>{c.states[state]}</StatusChip>
);

function FreezeRow(p: {
  f: FreezeDto;
  today: string;
  busy: boolean;
  onEnd: () => void;
  onCancel: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const action = freezeAction(p.f, p.today);
  const texts =
    action === 'cancel'
      ? { title: c.freezeCancelTitle, action: c.freezeCancel, run: p.onCancel }
      : { title: c.freezeEndTitle, action: c.freezeEnd, run: p.onEnd };
  return (
    <>
      <ListItem
        title={`${formatYmd(p.f.from)} – ${formatYmd(p.f.to)}`}
        subtitle={p.f.reason}
        after={action ? <span className="text-sm text-link">{texts.action}</span> : undefined}
        onClick={action && !p.busy ? () => setConfirm(true) : undefined}
      />
      <ConfirmSheet
        open={confirm}
        title={texts.title}
        action={texts.action}
        onClose={() => setConfirm(false)}
        onConfirm={texts.run}
      />
    </>
  );
}

export interface EnrollmentViewProps {
  student: string;
  e: EnrollmentDto;
  today: string;
  /** `student.manage`. */
  canManage: boolean;
  busy: boolean;
  onTransfer: () => void;
  onFreeze: () => void;
  onLeave: () => void;
  /** `discount.grant` bo'lsa. */
  onDiscount?: () => void;
  onFreezeEnd: (freezeId: string) => void;
  onFreezeCancel: (freezeId: string) => void;
}

/** MS-23a A'zolik: holat, chegirma, muzlatish, koʻchirish, chiqarish. */
export function EnrollmentView(p: EnrollmentViewProps) {
  const { e } = p;
  const open = e.endReason === null;
  const actions = [
    { icon: ArrowRightLeft, title: c.transfer, run: p.onTransfer },
    { icon: Snowflake, title: c.freeze, run: p.onFreeze },
    { icon: LogOut, title: c.leave, run: p.onLeave },
  ];
  return (
    <Screen title={e.group.name} subtitle={p.student}>
      <Section>
        <ListItem title={enrollmentDates(e)} after={<EnrollmentState state={e.state} />} />
        <ListItem
          before={<Percent className="size-5" aria-hidden />}
          title={e.discountPercent ? `${c.discount}: ${e.discountPercent}%` : c.noDiscount}
          chevron={open && p.onDiscount !== undefined}
          onClick={open ? p.onDiscount : undefined}
        />
      </Section>
      {e.freezes.length > 0 && (
        <Section title={c.freezes}>
          {e.freezes.map((f) => (
            <FreezeRow
              key={f.id}
              f={f}
              today={p.today}
              busy={p.busy || !p.canManage}
              onEnd={() => p.onFreezeEnd(f.id)}
              onCancel={() => p.onFreezeCancel(f.id)}
            />
          ))}
        </Section>
      )}
      {open && p.canManage && (
        <Section>
          {actions.map(({ icon: Icon, title, run }) => (
            <ListItem
              key={title}
              before={<Icon className="size-5" aria-hidden />}
              title={title}
              chevron
              onClick={run}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

export type GroupOption = Pick<GroupListItem, 'id' | 'name' | 'course'>;

const options = (groups: readonly GroupOption[]) =>
  groups.map((g) => ({ value: g.id, label: g.name, hint: g.course.name }));

function GroupChoice(p: {
  groups: readonly GroupOption[];
  value: string | null;
  onChange: (id: string) => void;
}) {
  if (p.groups.length === 0)
    return (
      <Section title={c.group}>
        <EmptyRow text={c.noGroups} />
      </Section>
    );
  return (
    <ChoiceSection
      title={c.group}
      value={p.value}
      options={options(p.groups)}
      onChange={p.onChange}
    />
  );
}

/** Guruhga yozish (FR-STU-3) — yana bitta guruh yoki qaytgan o'quvchi. */
export function EnrollView(p: {
  student: string;
  today: string;
  groups: readonly GroupOption[];
  saving: boolean;
  onSave: (v: { groupId: string; startDate: string }) => void;
}) {
  const [groupId, setGroup] = useState<string | null>(null);
  const [startDate, setDate] = useState(p.today);
  useMainButton({
    text: c.save,
    disabled: groupId === null || startDate === '',
    loading: p.saving,
    onClick: () => groupId && p.onSave({ groupId, startDate }),
  });
  return (
    <Screen title={c.title} subtitle={p.student}>
      <GroupChoice groups={p.groups} value={groupId} onChange={setGroup} />
      <Fields footer={c.startHint}>
        <TextField
          label={c.startDate}
          type="date"
          value={startDate}
          onChange={(e) => setDate(e.target.value)}
        />
      </Fields>
    </Screen>
  );
}

/** Koʻchirish: eski guruhda sana−1 gacha, yangisida sanadan (Q-103). */
export function TransferView(p: {
  student: string;
  fromGroup: string;
  minDate: string;
  today: string;
  groups: readonly GroupOption[];
  saving: boolean;
  onSave: (v: { toGroupId: string; date: string; note: string | null }) => void;
}) {
  const [groupId, setGroup] = useState<string | null>(null);
  const [date, setDate] = useState(p.today);
  const [note, setNote] = useState('');
  useMainButton({
    text: c.move,
    disabled: groupId === null || date === '' || date <= p.minDate,
    loading: p.saving,
    onClick: () => groupId && p.onSave({ toGroupId: groupId, date, note: note.trim() || null }),
  });
  return (
    <Screen title={c.transferTitle} subtitle={`${p.student} · ${p.fromGroup}`}>
      <GroupChoice groups={p.groups} value={groupId} onChange={setGroup} />
      <Fields footer={c.transferHint}>
        <TextField
          label={c.transferDate}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <TextArea
          label={c.note}
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Fields>
    </Screen>
  );
}

/** Muzlatish (BR-9): davr va sabab. */
export function FreezeView(p: {
  student: string;
  group: string;
  minDate: string;
  today: string;
  saving: boolean;
  onSave: (v: { from: string; to: string; reason: string }) => void;
}) {
  const [from, setFrom] = useState(p.today > p.minDate ? p.today : p.minDate);
  const [to, setTo] = useState('');
  const [reason, setReason] = useState('');
  const valid = from >= p.minDate && to >= from && reason.trim().length >= 3;
  useMainButton({
    text: c.freezeSave,
    disabled: !valid,
    loading: p.saving,
    onClick: () => p.onSave({ from, to, reason: reason.trim() }),
  });
  return (
    <Screen title={c.freezeTitle} subtitle={`${p.student} · ${p.group}`}>
      <Fields footer={c.freezeHint}>
        <TextField
          label={c.freezeFrom}
          type="date"
          min={p.minDate}
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <TextField
          label={c.freezeTo}
          type="date"
          min={from}
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
        <TextArea
          label={c.freezeReason}
          rows={2}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </Fields>
    </Screen>
  );
}
