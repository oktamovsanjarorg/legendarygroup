import {
  ANNOUNCEMENT_TARGET_TYPES,
  type AnnouncementItem,
  type AnnouncementStats,
  type NotificationStatus,
} from '@lg/contracts';
import { formatDateTime, miniappMessages as t } from '@lg/i18n';
import {
  type ChipTone,
  EmptyState,
  type FilePickState,
  FilePicker,
  ListItem,
  Section,
  StatusChip,
  TextArea,
  TextField,
  useMainButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import {
  type AnnForm,
  annReady,
  annTargetReady,
  needsTarget,
} from '../../data/staff-announcements.js';
import { Fields, Screen } from './form-kit.js';
import { ChoiceSection, ConfirmSheet } from './kit.js';

const c = t.staffAnn;

const delivered = (x: AnnouncementItem) =>
  x.status === 'processing'
    ? c.processing
    : c.delivered.replace('{n}', String(x.sentCount)).replace('{total}', String(x.totalRecipients));

/** MS-15 Eʼlonlar ro'yxati (T-139). */
export function AnnouncementsView(p: {
  items: readonly AnnouncementItem[];
  onOpen: (x: AnnouncementItem) => void;
  onAdd: () => void;
}) {
  useMainButton({ text: c.add, onClick: p.onAdd });
  if (p.items.length === 0)
    return (
      <Screen title={c.title}>
        <EmptyState title={c.empty} hint={c.emptyHint} />
      </Screen>
    );
  return (
    <Screen title={c.title}>
      <Section>
        {p.items.map((x) => (
          <ListItem
            key={x.id}
            title={x.title}
            subtitle={`${c.audiences[x.targetType]} · ${formatDateTime(new Date(x.createdAt))}`}
            after={<span className="text-sm text-text-muted">{delivered(x)}</span>}
            chevron
            onClick={() => p.onOpen(x)}
          />
        ))}
      </Section>
    </Screen>
  );
}

interface Option {
  id: string;
  name: string;
}
export interface AnnFormViewProps {
  form: AnnForm;
  groups: readonly Option[];
  courses: readonly Option[];
  /** `null` — hisoblanmoqda. */
  count: number | null;
  file: FilePickState;
  sending: boolean;
  onForm: (f: AnnForm) => void;
  onPickFile: () => void;
  onSend: () => void;
}

function Target({ p }: { p: AnnFormViewProps }) {
  const { form, onForm } = p;
  if (!needsTarget(form.targetType)) return null;
  const isGroup = form.targetType === 'group';
  return (
    <ChoiceSection
      title={isGroup ? c.pickGroup : c.pickCourse}
      value={form.targetId}
      options={(isGroup ? p.groups : p.courses).map((o) => ({ value: o.id, label: o.name }))}
      onChange={(targetId) => onForm({ ...form, targetId })}
    />
  );
}

function Preview({ form }: { form: AnnForm }) {
  if (form.body.trim() === '') return null;
  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="px-4 text-sm uppercase tracking-wide text-text-muted">{c.preview}</h2>
      <div className="max-w-[85%] self-start whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm bg-bg px-4 py-3 text-base text-text shadow-sm">
        <p className="font-semibold">{form.title.trim()}</p>
        {form.body.trim()}
      </div>
    </section>
  );
}

const countText = (n: number) => (n === 0 ? c.nobody : c.count.replace('{n}', String(n)));

/** MS-15 Yangi eʼlon: auditoriya → matn → ko'rib chiqish → tasdiq. */
export function AnnFormView(p: AnnFormViewProps) {
  const { form, onForm } = p;
  const [confirm, setConfirm] = useState(false);
  useMainButton({
    text: c.send,
    disabled: !annReady(form, p.count ?? 0) || p.file.kind === 'uploading',
    loading: p.sending,
    onClick: () => setConfirm(true),
  });
  return (
    <Screen title={c.add}>
      <ChoiceSection
        title={c.audience}
        value={form.targetType}
        options={ANNOUNCEMENT_TARGET_TYPES.map((value) => ({ value, label: c.audiences[value] }))}
        onChange={(targetType) => onForm({ ...form, targetType, targetId: null })}
      />
      <Target p={p} />
      <Fields footer={annTargetReady(form) && p.count !== null ? countText(p.count) : undefined}>
        <TextField
          label={c.subject}
          maxLength={200}
          value={form.title}
          onChange={(e) => onForm({ ...form, title: e.target.value })}
        />
        <TextArea
          label={c.body}
          rows={5}
          maxLength={3500}
          value={form.body}
          onChange={(e) => onForm({ ...form, body: e.target.value })}
        />
      </Fields>
      <FilePicker
        label={c.file}
        state={p.file}
        pickLabel={c.pickFile}
        replaceLabel={c.replaceFile}
        uploadingLabel={t.staffKit.uploading}
        onPick={p.onPickFile}
      />
      <Preview form={form} />
      <ConfirmSheet
        open={confirm}
        title={c.confirm.replace('{n}', String(p.count ?? 0))}
        action={c.send}
        onClose={() => setConfirm(false)}
        onConfirm={p.onSend}
      />
    </Screen>
  );
}

const TONES: Record<NotificationStatus, ChipTone> = {
  queued: 'info',
  sent: 'success',
  failed: 'danger',
  blocked: 'warning',
};

/** Bitta eʼlon: kimga yetdi, kimga yo'q (qo'ng'iroq uchun telefon). */
export function AnnouncementView({ stats }: { stats: AnnouncementStats }) {
  return (
    <Screen
      title={stats.title}
      subtitle={c.delivered
        .replace('{n}', String(stats.sentCount))
        .replace('{total}', String(stats.totalRecipients))}
    >
      <Section title={c.recipients}>
        {stats.recipients.map((r) => (
          <ListItem
            key={r.id}
            title={r.recipientName}
            subtitle={
              r.recipientPhone && r.status !== 'sent' ? (
                <a className="text-link" href={`tel:${r.recipientPhone}`}>
                  {r.recipientPhone}
                </a>
              ) : undefined
            }
            after={<StatusChip tone={TONES[r.status]}>{c.status[r.status]}</StatusChip>}
          />
        ))}
      </Section>
    </Screen>
  );
}
