import { webMessages as t } from '@lg/i18n';
import { Button, ForbiddenState } from '@lg/ui-web';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useAuth } from '../../auth/auth.js';
import { WIZARD_STEPS, WizardView } from '../../screens/f1/wizard.js';
import { CourseDrawer } from '../courses/course-drawer.js';
import { RoomDrawer } from '../courses/room-drawer.js';
import { InviteDrawer } from '../staff/invite-drawer.js';
import { CreateDrawer as StudentDrawer } from '../students/create-drawer.js';
import { BotInvite } from './bot-invite.js';
import { useSetup } from './use-setup.js';

const STORAGE_KEY = 'lg_wizard_step';
const a = t.wizard.actions;

/** Qaysi qadamda turgani — faqat shu brauzer uchun qulaylik (holat serverda). */
const readStep = (): number => {
  try {
    const n = Number(localStorage.getItem(STORAGE_KEY) ?? 0);
    return Number.isInteger(n) && n >= 0 && n < WIZARD_STEPS ? n : 0;
  } catch {
    return 0;
  }
};
const writeStep = (n: number | null) => {
  try {
    if (n === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    // Saqlash bloklangan (maxfiy oyna) — qadam faqat shu sessiyada.
  }
};

type Drawer = 'course' | 'room' | 'teacher' | 'student' | null;

function StepAction({ step, open }: { step: number; open: (d: Drawer) => void }) {
  const navigate = useNavigate();
  const go = (to: '/settings' | '/groups', label: string) => (
    <Button variant="secondary" onClick={() => void navigate({ to })}>
      {label}
    </Button>
  );
  const add = (d: Drawer, label: string) => (
    <Button onClick={() => open(d)}>
      <Plus className="size-4" aria-hidden />
      {label}
    </Button>
  );
  const actions: Record<number, () => ReactNode> = {
    0: () => go('/settings', a.settings),
    1: () => go('/settings', a.settings),
    2: () => add('course', a.course),
    3: () => add('room', a.room),
    4: () => add('teacher', a.teacher),
    5: () => go('/groups', a.group),
    6: () => add('student', a.student),
  };
  return <div className="flex gap-2">{actions[step]?.()}</div>;
}

function Wizard() {
  const navigate = useNavigate();
  const { steps, botUrl } = useSetup();
  const [step, setStepState] = useState(readStep);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const setStep = (n: number) => {
    const next = Math.max(0, Math.min(WIZARD_STEPS - 1, n));
    setStepState(next);
    writeStep(next);
  };
  const close = () => setDrawer(null);
  return (
    <>
      <WizardView
        step={step}
        done={steps.map((s) => s.done)}
        count={steps[step]?.count}
        onNext={() => setStep(step + 1)}
        onBack={() => setStep(step - 1)}
        onSkip={() => setStep(step + 1)}
        onFinish={() => {
          writeStep(null);
          void navigate({ to: '/' });
        }}
      >
        {step === WIZARD_STEPS - 1 ? (
          <BotInvite url={botUrl} />
        ) : (
          <StepAction step={step} open={setDrawer} />
        )}
      </WizardView>
      {drawer === 'course' && <CourseDrawer onClose={close} />}
      {drawer === 'room' && <RoomDrawer onClose={close} />}
      {drawer === 'teacher' && <InviteDrawer onClose={close} />}
      {drawer === 'student' && <StudentDrawer onCreated={close} onClose={close} />}
    </>
  );
}

/** W-33 ustasi (T-117): faqat Director (`settings.manage`). */
export function WizardPage() {
  const { permissions } = useAuth();
  const navigate = useNavigate();
  if (!permissions.has('settings.manage'))
    return <ForbiddenState onHome={() => void navigate({ to: '/' })} />;
  return <Wizard />;
}
