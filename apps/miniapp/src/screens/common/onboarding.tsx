import { miniappMessages as t } from '@lg/i18n';
import { ListItem, Section, StateShell, TextField, useMainButton } from '@lg/ui-tg';
import { GraduationCap, Hourglass, Smartphone, UserRoundX } from 'lucide-react';

const c = t.onboarding;

export type OnboardPhase =
  'start' | 'checking' | 'declined' | 'unknown' | 'requested' | 'conflict' | 'student';

export interface OnboardingViewProps {
  phase: OnboardPhase;
  /** Telegram `requestContact`ni qo'llaydi (6.9+). */
  canShare: boolean;
  busy: boolean;
  error: string | null;
  code: string;
  onCode: (code: string) => void;
  onShare: () => void;
  onRequest: () => void;
  onStudent: () => void;
  onBack: () => void;
  onRefresh: () => void;
  onSubmitCode: () => void;
  onBot: () => void;
}

const MAIN: Record<OnboardPhase, keyof typeof c> = {
  start: 'share',
  checking: 'share',
  declined: 'share',
  conflict: 'share',
  unknown: 'request',
  requested: 'refresh',
  student: 'enter',
};

function useOnboardButton(p: OnboardingViewProps) {
  const action: Record<OnboardPhase, () => void> = {
    start: p.onShare,
    checking: p.onShare,
    declined: p.onShare,
    conflict: p.onShare,
    unknown: p.onRequest,
    requested: p.onRefresh,
    student: p.onSubmitCode,
  };
  const old = !p.canShare;
  useMainButton({
    text: old ? c.backToBot : c[MAIN[p.phase]],
    onClick: old ? p.onBot : action[p.phase],
    loading: p.busy || p.phase === 'checking',
    disabled: !old && p.phase === 'student' && !/^\d{6}$/.test(p.code),
  });
}

const HINT: Partial<Record<OnboardPhase, string>> = {
  start: c.hint,
  checking: c.checking,
  declined: c.hint,
  conflict: c.conflict,
};

/** C-03 Xush kelibsiz (Q-111): raqam ulashish, o'quvchi kodi, noma'lum raqam — so'rov. */
export function OnboardingView(p: OnboardingViewProps) {
  useOnboardButton(p);
  const error = p.error && (
    <p role="alert" className="rounded-xl bg-danger-bg p-3 text-sm text-danger">
      {p.error}
    </p>
  );
  if (!p.canShare)
    return (
      <StateShell
        icon={<Smartphone className="size-10" aria-hidden />}
        title={c.title}
        hint={c.oldClient}
      />
    );
  if (p.phase === 'student') return <StudentForm p={p} error={error} />;
  if (p.phase === 'unknown' || p.phase === 'requested') {
    const requested = p.phase === 'requested';
    return (
      <StateShell
        icon={
          requested ? (
            <Hourglass className="size-10" aria-hidden />
          ) : (
            <UserRoundX className="size-10" aria-hidden />
          )
        }
        title={requested ? c.requestedTitle : c.unknownTitle}
        hint={requested ? c.requestedHint : c.unknownHint}
      >
        {error}
        {!requested && <StudentLink onStudent={p.onStudent} />}
      </StateShell>
    );
  }
  return (
    <StateShell
      icon={<Smartphone className="size-10" aria-hidden />}
      title={c.title}
      hint={HINT[p.phase]}
    >
      {error}
      <StudentLink onStudent={p.onStudent} />
    </StateShell>
  );
}

function StudentLink({ onStudent }: { onStudent: () => void }) {
  return (
    <button
      type="button"
      className="mt-2 flex items-center gap-2 text-base text-link"
      onClick={onStudent}
    >
      <GraduationCap className="size-5" aria-hidden />
      {c.student}
    </button>
  );
}

function StudentForm({ p, error }: { p: OnboardingViewProps; error: React.ReactNode }) {
  return (
    <main className="flex flex-col gap-4 p-4">
      <h1 className="text-xl font-semibold text-text">{c.studentTitle}</h1>
      <p className="text-sm text-text-muted">{c.studentHint}</p>
      {error}
      <TextField
        label={c.code}
        inputMode="numeric"
        autoComplete="one-time-code"
        value={p.code}
        onChange={(e) => p.onCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      />
      <Section>
        <ListItem title={<span className="text-link">{c.back}</span>} onClick={p.onBack} />
      </Section>
    </main>
  );
}
