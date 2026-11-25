import type { PaymentCard } from '@lg/contracts';
import { ForbiddenState, useHaptic } from '@lg/ui-tg';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useState } from 'react';
import { useOpenFile } from '../data/open-file.js';
import { QueryView } from '../data/query-view.js';
import {
  type CardForm,
  emptyCard,
  sectionPatch,
  type Settings,
  SETTINGS_SECTIONS,
  type SettingsForm,
  type SettingsSection,
  type StartStep,
  toForm,
  useSaveSettings,
  useSettings,
  useStart,
  withCard,
  withoutCard,
  withPrimary,
} from '../data/staff-settings.js';
import {
  CardsView,
  CardView,
  SettingsMenuView,
  SettingsSectionView,
  StartView,
} from '../screens/staff/settings.js';
import { ErrorNotice } from './notice.js';
import { useFilePicker } from './use-file-picker.js';

/** Saqlash → muvaffaqiyatda `then`. */
function useSave(then: () => void) {
  const save = useSaveSettings();
  const haptic = useHaptic();
  const run = (body: object) =>
    save.mutate(body, {
      onSuccess: () => {
        haptic.success();
        then();
      },
      onError: () => haptic.error(),
    });
  return { save, run };
}

/** MS-32 Sozlamalar (T-161). */
export function StaffSettingsPage() {
  const navigate = useNavigate();
  return (
    <SettingsMenuView
      onOpen={(x) => {
        if (x === 'holidays') void navigate({ to: '/staff/holidays' });
        else if (x === 'cards') void navigate({ to: '/staff/settings/cards' });
        else if (x === 'start') void navigate({ to: '/staff/settings/start' });
        else void navigate({ to: '/staff/settings/$section', params: { section: x } });
      }}
    />
  );
}

function SectionForm({ settings, section }: { settings: Settings; section: SettingsSection }) {
  const navigate = useNavigate();
  const [form, setForm] = useState<SettingsForm>(() => toForm(settings));
  const logo = useFilePicker('center_logo');
  const openFile = useOpenFile();
  const { save, run } = useSave(() => void navigate({ to: '/staff/settings', replace: true }));
  const saved = settings.centerInfo.logoFileId;
  return (
    <>
      <ErrorNotice error={save.error ?? openFile.error} />
      {logo.input}
      <SettingsSectionView
        section={section}
        form={form}
        onForm={setForm}
        saving={save.isPending}
        onSave={() => {
          const body = sectionPatch(section, form, logo.fileId);
          if (body) run(body);
        }}
        logo={logo.state}
        onPickLogo={logo.open}
        onOpenLogo={saved ? () => openFile.mutate(saved) : undefined}
      />
    </>
  );
}

export function StaffSettingsSectionPage() {
  const params = useParams({ from: '/staff/settings/$section' });
  const navigate = useNavigate();
  const section = SETTINGS_SECTIONS.find((x) => x === params.section);
  const query = useSettings();
  if (!section) return <ForbiddenState onHome={() => void navigate({ to: '/staff/settings' })} />;
  return (
    <QueryView query={query}>
      {(settings) => <SectionForm key={section} settings={settings} section={section} />}
    </QueryView>
  );
}

export function StaffCardsPage() {
  const navigate = useNavigate();
  const open = (id: string) => void navigate({ to: '/staff/settings/cards/$id', params: { id } });
  return (
    <QueryView query={useSettings()}>
      {(x) => <CardsView cards={x.paymentCards} onOpen={open} onAdd={() => open('new')} />}
    </QueryView>
  );
}

function CardEditor({ cards, id }: { cards: readonly PaymentCard[]; id: string }) {
  const navigate = useNavigate();
  const saved = cards.find((x) => x.id === id) ?? null;
  const [form, setForm] = useState<CardForm>(saved ?? emptyCard);
  const { save, run } = useSave(
    () => void navigate({ to: '/staff/settings/cards', replace: true }),
  );
  const put = (paymentCards: PaymentCard[]) => run({ paymentCards });
  return (
    <>
      <ErrorNotice error={save.error} />
      <CardView
        form={form}
        saved={saved}
        saving={save.isPending}
        onForm={setForm}
        onSave={() => put(withCard(cards, saved?.id ?? crypto.randomUUID(), form))}
        onPrimary={() => put(withPrimary(cards, id))}
        onRemove={() => put(withoutCard(cards, id))}
      />
    </>
  );
}

export function StaffCardPage() {
  const { id } = useParams({ from: '/staff/settings/cards/$id' });
  return (
    <QueryView query={useSettings()}>
      {(x) => <CardEditor cards={x.paymentCards} id={id} />}
    </QueryView>
  );
}

const STEP_PATHS: Record<StartStep, string> = {
  center: '/staff/settings/center',
  cards: '/staff/settings/cards',
  courses: '/staff/courses',
  rooms: '/staff/rooms',
  teachers: '/staff/people',
  groups: '/staff/groups',
  students: '/staff/new',
};

/** MS-32c Boshlash ustasi. */
export function StaffStartPage() {
  const navigate = useNavigate();
  return (
    <QueryView query={useStart()}>
      {(state) => <StartView state={state} onStep={(x) => void navigate({ to: STEP_PATHS[x] })} />}
    </QueryView>
  );
}
