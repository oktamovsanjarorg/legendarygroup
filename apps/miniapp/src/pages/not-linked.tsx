import { miniappMessages as t } from '@lg/i18n';
import { StateShell, supports, useHaptic, useMainButton, useWebApp } from '@lg/ui-tg';
import { Link2Off } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useSession } from '../session/session.js';

const c = t.notLinked;
/** Bot kontaktni qayta ishlashi bir necha soniya: 2 s × 10 urinish. */
export const RELINK_DELAY_MS = 2000;
export const RELINK_TRIES = 10;

type Phase = 'idle' | 'waiting' | 'not_found' | 'declined';

/** Kontakt ulashilgach — bot bog'laguncha qayta kirib ko'riladi (yuklanish ekranisiz). */
function useRelinkPoll(onDone: (linked: boolean) => void) {
  const { relink } = useSession();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);
  return (left = RELINK_TRIES) => {
    const tick = (n: number) => {
      timer.current = setTimeout(() => {
        void relink().then((ok) => (ok ? onDone(true) : n > 1 ? tick(n - 1) : onDone(false)));
      }, RELINK_DELAY_MS);
    };
    tick(left);
  };
}

/**
 * C-03 Akkaunt bog'lanmagan (Q-109): Mini App ichida raqam ulashish — Telegram kontaktni bot
 * chatiga yuboradi, bot xodim/ota-onani bog'laydi, ilova o'zi qayta kiradi. Eski klientda
 * (`requestContact` yo'q) — botga qaytish.
 */
export function NotLinkedPage() {
  const wa = useWebApp();
  const haptic = useHaptic();
  const [phase, setPhase] = useState<Phase>('idle');
  const poll = useRelinkPoll((linked) => {
    if (linked) haptic.success();
    else setPhase('not_found');
  });
  const canShare = supports(wa, 'requestContact') && typeof wa.requestContact === 'function';
  const share = () =>
    wa.requestContact?.((shared) => {
      if (!shared) return setPhase('declined');
      setPhase('waiting');
      poll();
    });
  const ask = canShare && phase !== 'not_found';
  useMainButton({
    text: ask ? c.share : c.backToBot,
    loading: phase === 'waiting',
    onClick: ask ? share : () => wa.close(),
  });
  const hint = {
    idle: c.shareHint,
    waiting: c.waiting,
    not_found: c.notFound,
    declined: c.declined,
  }[phase];
  return (
    <StateShell
      icon={<Link2Off className="size-10" aria-hidden />}
      title={c.title}
      hint={canShare ? hint : c.staffHint}
    >
      <p className="text-sm text-text-muted">{c.studentHint}</p>
    </StateShell>
  );
}
