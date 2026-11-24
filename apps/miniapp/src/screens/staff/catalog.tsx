import type { Course, GradeScale, Room } from '@lg/contracts';
import { formatMoney, miniappMessages as t } from '@lg/i18n';
import {
  EmptyState,
  ListItem,
  MoneyInput,
  Section,
  Segmented,
  TextArea,
  TextField,
  useMainButton,
  useSecondaryButton,
} from '@lg/ui-tg';
import { useState } from 'react';
import { type CourseForm, courseReady } from '../../data/staff-catalog.js';
import { Fields, Screen } from './form-kit.js';
import { ConfirmSheet } from './kit.js';

const c = t.staffCourses;
export type CatalogFilter = keyof typeof c.filters;

export interface CatalogViewProps {
  title: string;
  empty: string;
  addText: string;
  items: readonly { id: string; title: string; subtitle: string }[];
  filter: CatalogFilter;
  onFilter: (f: CatalogFilter) => void;
  onOpen: (id: string) => void;
  onAdd: () => void;
}

export const courseRows = (list: readonly Course[]) =>
  list.map((x) => ({
    id: x.id,
    title: x.name,
    subtitle: [
      formatMoney(BigInt(x.defaultMonthlyPrice)),
      c.minutes.replace('{n}', String(x.lessonDurationMin)),
      x.levels.join(', '),
    ]
      .filter(Boolean)
      .join(' · '),
  }));

export const roomRows = (list: readonly Room[]) =>
  list.map((x) => ({
    id: x.id,
    title: x.name,
    subtitle: c.capacityOf.replace('{n}', String(x.capacity)),
  }));

/** MS-21 Kurslar / xonalar ro'yxati (T-150). */
export function CatalogView(p: CatalogViewProps) {
  useMainButton({ text: p.addText, onClick: p.onAdd });
  return (
    <Screen title={p.title}>
      <Segmented<CatalogFilter>
        label={c.filterLabel}
        value={p.filter}
        options={(['active', 'archived'] as const).map((value) => ({
          value,
          label: c.filters[value],
        }))}
        onChange={p.onFilter}
      />
      {p.items.length === 0 ? (
        <EmptyState title={p.empty} hint={c.emptyHint} />
      ) : (
        <Section>
          {p.items.map((x) => (
            <ListItem
              key={x.id}
              title={x.title}
              subtitle={x.subtitle}
              chevron
              onClick={() => p.onOpen(x.id)}
            />
          ))}
        </Section>
      )}
    </Screen>
  );
}

interface ArchiveProps {
  /** Yangi yozuvda — yo'q. */
  archived?: boolean;
  onArchive?: () => void;
}

/** Arxivlash (tasdiq bilan) / arxivdan chiqarish — SecondaryButton. */
function ArchiveButton({ archived, onArchive }: ArchiveProps) {
  const [open, setOpen] = useState(false);
  useSecondaryButton({
    text: archived ? c.restore : c.archive,
    visible: onArchive !== undefined,
    onClick: () => (archived ? onArchive?.() : setOpen(true)),
  });
  return (
    <ConfirmSheet
      open={open}
      title={c.archive}
      action={c.archive}
      danger
      onClose={() => setOpen(false)}
      onConfirm={() => onArchive?.()}
    >
      {c.archiveAsk}
    </ConfirmSheet>
  );
}

export interface CourseFormViewProps extends ArchiveProps {
  title: string;
  form: CourseForm;
  saving: boolean;
  onForm: (f: CourseForm) => void;
  onSave: () => void;
}

const digits = (v: string) => v.replace(/\D/g, '');

const ScalePicker = (p: { value: GradeScale; onChange: (s: GradeScale) => void }) => (
  <Segmented<GradeScale>
    label={c.scale}
    value={p.value}
    options={(['0_5', '0_100'] as const).map((value) => ({ value, label: c.scales[value] }))}
    onChange={p.onChange}
  />
);

export function CourseFormView(p: CourseFormViewProps) {
  const { form, onForm } = p;
  useMainButton({
    text: c.save,
    visible: !p.archived,
    disabled: !courseReady(form),
    loading: p.saving,
    onClick: p.onSave,
  });
  const set = (patch: Partial<CourseForm>) => onForm({ ...form, ...patch });
  return (
    <Screen title={p.title}>
      <Fields footer={c.priceHint}>
        <TextField
          label={c.name}
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <MoneyInput
          label={c.price}
          allowZero
          value={form.price}
          onChange={(price) => set({ price })}
        />
        <TextField
          label={c.duration}
          inputMode="numeric"
          value={form.duration}
          onChange={(e) => set({ duration: digits(e.target.value) })}
        />
        <TextField
          label={c.months}
          inputMode="numeric"
          value={form.months}
          onChange={(e) => set({ months: digits(e.target.value) })}
        />
      </Fields>
      <ScalePicker value={form.scale} onChange={(scale) => set({ scale })} />
      <Fields footer={c.levelsHint}>
        <TextField
          label={c.levels}
          value={form.levels}
          onChange={(e) => set({ levels: e.target.value })}
        />
        <TextArea
          label={c.description}
          rows={3}
          maxLength={1000}
          value={form.description}
          onChange={(e) => set({ description: e.target.value })}
        />
      </Fields>
      <ArchiveButton archived={p.archived} onArchive={p.onArchive} />
    </Screen>
  );
}

export function RoomFormView(
  p: ArchiveProps & {
    title: string;
    initial: { name: string; capacity: number };
    saving: boolean;
    onSave: (v: { name: string; capacity: number }) => void;
  },
) {
  const [name, setName] = useState(p.initial.name);
  const [capacity, setCapacity] = useState(String(p.initial.capacity));
  const n = Number(capacity);
  useMainButton({
    text: c.save,
    visible: !p.archived,
    disabled: name.trim().length < 2 || n < 1 || n > 500,
    loading: p.saving,
    onClick: () => p.onSave({ name: name.trim(), capacity: n }),
  });
  return (
    <Screen title={p.title}>
      <Fields>
        <TextField label={c.name} value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label={c.capacity}
          inputMode="numeric"
          value={capacity}
          onChange={(e) => setCapacity(digits(e.target.value))}
        />
      </Fields>
      <ArchiveButton archived={p.archived} onArchive={p.onArchive} />
    </Screen>
  );
}
