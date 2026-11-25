import type { BotStudentLinkResult } from '@lg/contracts';
import { miniappMessages as t } from '@lg/i18n';
import { errorText } from '@lg/ui-core';
import { supports, useHaptic, useWebApp } from '@lg/ui-tg';
import { useEffect, useState } from 'react';
import { useOnboard } from '../data/onboarding.js';
import { type OnboardPhase, OnboardingView } from '../screens/common/onboarding.js';
import { useSession } from '../session/session.js';

const c = t.onboarding;
const STUDENT_ERRORS: Partial<Record<BotStudentLinkResult['result'], string>> = {
  invalid: c.codeInvalid,
  in_use: c.codeInUse,
  rate_limited: c.rateLimited,
};

/**
 * C-03 Birinchi kirish (Q-111): raqam Telegram'ning o'z oynasida ulashiladi, server imzoni
 * tekshirib darhol bog'laydi va ilova kiradi — botga chiqish yo'q.
 */
/** Raqam (bir marta so'raladi, xotirada) + band holat va xato bilan amal. */
function useContactRun(onDeclined: () => void) {
  const wa = useWebApp();
  const haptic = useHaptic();
  const [contact, setContact] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const askContact = () =>
    contact
      ? Promise.resolve(contact)
      : new Promise<string | null>((done) =>
          wa.requestContact?.((ok, r) => done(ok && r?.response ? r.response : null)),
        );
  const run = async (fn: (c: string) => Promise<void>) => {
    const got = await askContact();
    if (!got) return (setError(c.declined), onDeclined());
    setContact(got);
    setBusy(true);
    setError(null);
    try {
      await fn(got);
    } catch (e) {
      haptic.error();
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return { run, busy, error, setError };
}

/** Qayta ochilganda: so'rov kutilyapti — kutish ekrani; rad etilgan — sababi bilan. */
function useResumeRequest(
  status: ReturnType<typeof useOnboard>['status'],
  setPhase: (p: OnboardPhase) => void,
  setError: (e: string) => void,
) {
  const [once] = useState(() => status);
  useEffect(() => {
    void once()
      .then((s) => {
        if (s.status === 'pending_approval') setPhase('requested');
        if (s.status === 'rejected')
          setError(c.rejected.replace('{reason}', s.rejectReason ?? '—'));
      })
      .catch(() => undefined);
  }, [once, setPhase, setError]);
}

function useOnboardFlow() {
  const wa = useWebApp();
  const haptic = useHaptic();
  const { relink } = useSession();
  const onboard = useOnboard();
  const [phase, setPhase] = useState<OnboardPhase>('start');
  const [prev, setPrev] = useState<OnboardPhase>('start');
  const [code, setCode] = useState('');
  const canShare = supports(wa, 'requestContact') && typeof wa.requestContact === 'function';
  const { run, busy, error, setError } = useContactRun(() =>
    setPhase((p) => (p === 'student' ? p : 'declined')),
  );
  useResumeRequest(onboard.status, setPhase, setError);

  const enter = async () => {
    const ok = await relink();
    if (ok) haptic.success();
    return ok;
  };

  const byPhone = (createRequest: boolean) =>
    run(async (got) => {
      if (!createRequest) setPhase('checking');
      const { result } = await onboard.contact(got, createRequest);
      if (result === 'linked') return void (await enter());
      setPhase(
        result === 'not_found' ? 'unknown' : result === 'conflict' ? 'conflict' : 'requested',
      );
    });
  const byCode = () =>
    run(async (got) => {
      const { result } = await onboard.student(got, code);
      if (result === 'linked' || result === 'already_linked') return void (await enter());
      setError(STUDENT_ERRORS[result] ?? c.codeInvalid);
    });

  return {
    wa,
    phase,
    setPhase,
    prev,
    setPrev,
    code,
    setCode,
    busy,
    error,
    setError,
    canShare,
    byPhone,
    byCode,
    enter,
  };
}

export function NotLinkedPage() {
  const {
    wa,
    phase,
    setPhase,
    prev,
    setPrev,
    code,
    setCode,
    busy,
    error,
    setError,
    canShare,
    byPhone,
    byCode,
    enter,
  } = useOnboardFlow();
  return (
    <OnboardingView
      phase={phase}
      canShare={canShare}
      busy={busy}
      error={error}
      code={code}
      onCode={setCode}
      onShare={() => void byPhone(false)}
      onRequest={() => void byPhone(true)}
      onStudent={() => (setError(null), setPrev(phase), setPhase('student'))}
      onBack={() => (setError(null), setPhase(prev))}
      onRefresh={() => void enter().then((ok) => ok || setError(c.notYet))}
      onSubmitCode={() => void byCode()}
      onBot={() => wa.close()}
    />
  );
}
